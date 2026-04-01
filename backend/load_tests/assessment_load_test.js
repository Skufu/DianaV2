import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for assessment load testing
const assessmentErrorRate = new Rate('assessment_errors');
const assessmentLatency = new Trend('assessment_latency');
const assessmentSuccessRate = new Rate('assessment_success');
const assessmentsCreated = new Counter('assessments_created');

// Test configuration: 100 concurrent users for 5 minutes
export const options = {
    stages: [
        // Ramp-up: 0 -> 100 VUs over 30 seconds
        { duration: '30s', target: 100 },
        // Steady state: 100 VUs for 4 minutes
        { duration: '4m', target: 100 },
        // Ramp-down: 100 -> 0 VUs over 30 seconds
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        // Critical: p95 latency must be < 200ms
        http_req_duration: ['p(95)<200'],
        // Success rate must be >= 99%
        assessment_success: ['rate>=0.99'],
        // No more than 1% errors
        assessment_errors: ['rate<0.01'],
        // Assessment latency tracking
        assessment_latency: ['p(95)<200', 'p(99)<300'],
    },
};

// Configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'loadtest@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'LoadTest123!';

// Test data for assessment requests (postmenopausal women 45-60 years)
const generateAssessmentPayload = (vuId) => {
    // Generate realistic biomarker values within clinical ranges
    // Age must be between 45-60 for postmenopausal women
    const age = 45 + Math.floor(Math.random() * 16); // 45-60
    
    // HbA1c: 4.0-15.0 (normal ~5.7, elevated >6.5)
    const hba1c = 5.0 + Math.random() * 5; // 5.0-10.0
    
    // FBS: 70-200 mg/dL (normal <100, prediabetes 100-125, diabetes >=126)
    const fbs = 80 + Math.random() * 60; // 80-140
    
    // BMI: 18.5-40 (normal 18.5-24.9, overweight 25-29.9, obese >=30)
    const bmi = 22 + Math.random() * 15; // 22-37
    
    // Cholesterol: 150-300 mg/dL
    const cholesterol = 150 + Math.floor(Math.random() * 100);
    
    // LDL: 70-200 mg/dL (optimal <100)
    const ldl = 80 + Math.floor(Math.random() * 80);
    
    // HDL: 30-80 mg/dL (good >=50 for women)
    const hdl = 40 + Math.floor(Math.random() * 30);
    
    // Triglycerides: 100-300 mg/dL (normal <150)
    const triglycerides = 100 + Math.floor(Math.random() * 150);
    
    // Blood pressure (systolic/diastolic)
    const systolic = 110 + Math.floor(Math.random() * 30); // 110-140
    const diastolic = 70 + Math.floor(Math.random() * 20); // 70-90
    
    // Waist circumference: 70-120 cm
    const waistCircumference = 75 + Math.random() * 30;
    
    return JSON.stringify({
        age: age,
        hba1c: hba1c.toFixed(1),
        fbs: fbs.toFixed(1),
        bmi: bmi.toFixed(1),
        cholesterol: cholesterol,
        ldl: ldl,
        hdl: hdl,
        triglycerides: triglycerides,
        systolic: systolic,
        diastolic: diastolic,
        waist_circumference: waistCircumference.toFixed(1),
        family_history_diabetes: Math.random() > 0.5,
        activity: ['Active', 'Moderate', 'Sedentary'][Math.floor(Math.random() * 3)],
        alcohol: ['Current', 'Former', 'Never', 'Unknown'][Math.floor(Math.random() * 4)],
        smoking: ['never', 'former', 'current'][Math.floor(Math.random() * 3)],
        hypertension: ['no', 'controlled', 'uncontrolled'][Math.floor(Math.random() * 3)],
        heart_disease: ['no', 'yes'][Math.floor(Math.random() * 2)],
        model_type: 'binary_v2_no_bp', // Default model type
    });
};

// Login to get JWT token
function login() {
    const loginPayload = JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
    });
    
    const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
    });
    
    const success = check(loginResponse, {
        'login successful': (r) => r.status === 200,
        'received token': (r) => r.json('token') !== undefined,
    });
    
    if (!success) {
        console.error(`Login failed: ${loginResponse.status} - ${loginResponse.body}`);
        return null;
    }
    
    return loginResponse.json('token');
}

// Register test user if not exists (setup phase)
function registerUser() {
    const registerPayload = JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        first_name: 'LoadTest',
        last_name: 'User',
    });
    
    const registerResponse = http.post(`${BASE_URL}/api/v1/auth/register`, registerPayload, {
        headers: { 'Content-Type': 'application/json' },
    });
    
    // Accept both 200 (success) and 400/409 (user already exists)
    check(registerResponse, {
        'registration acceptable': (r) => r.status === 200 || r.status === 400 || r.status === 409,
    });
}

// Setup function called once per VU
export function setup() {
    console.log('Setting up load test...');
    
    // Try to register the test user
    registerUser();
    
    // Login to verify credentials work
    const token = login();
    if (!token) {
        console.error('Failed to login during setup. Test may fail.');
    }
    
    return { token: token };
}

// Main test function
export default function (data) {
    // Get or refresh token if needed
    let token = data.token;
    
    if (!token) {
        token = login();
        if (!token) {
            assessmentErrorRate.add(1);
            console.error('Failed to obtain auth token');
            sleep(1);
            return;
        }
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    
    // Generate unique assessment payload
    const payload = generateAssessmentPayload(__VU);
    
    // Create assessment - this includes ML prediction timing
    const startTime = new Date();
    const response = http.post(`${BASE_URL}/api/v1/users/me/assessments`, payload, { headers });
    const endTime = new Date();
    const latencyMs = endTime - startTime;
    
    // Record metrics
    assessmentLatency.add(latencyMs);
    
    const success = check(response, {
        'assessment created successfully': (r) => r.status === 201,
        'response has risk_score': (r) => {
            try {
                const body = r.json();
                return body.risk_score !== undefined && body.risk_score >= 0 && body.risk_score <= 100;
            } catch (e) {
                return false;
            }
        },
        'response has cluster': (r) => {
            try {
                const body = r.json();
                return body.cluster !== undefined;
            } catch (e) {
                return false;
            }
        },
        'response has prediction': (r) => {
            try {
                const body = r.json();
                return body.predicted_status !== undefined;
            } catch (e) {
                return false;
            }
        },
        'latency under 200ms': () => latencyMs < 200,
    });
    
    assessmentSuccessRate.add(success ? 1 : 0);
    assessmentErrorRate.add(success ? 0 : 1);
    
    if (success) {
        assessmentsCreated.add(1);
    } else {
        console.error(`Assessment creation failed: ${response.status} - ${response.body}`);
    }
    
    // Log detailed timing for debugging
    if (latencyMs > 200) {
        console.warn(`Slow assessment: ${latencyMs}ms (VU: ${__VU}, Iteration: ${__ITER})`);
    }
    
    // Small sleep to simulate user think time (100-500ms)
    sleep(0.1 + Math.random() * 0.4);
}

// Teardown function
export function teardown(data) {
    console.log('Load test completed. Cleaning up...');
}
