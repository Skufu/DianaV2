/**
 * ML Predict Endpoint Load Test
 * Target: <100ms p95 latency for POST /predict endpoint
 * 
 * Usage:
 *   k6 run Ian_ML/load_tests/predict_load_test.js
 *   k6 run --vus 50 --duration 3m Ian_ML/load_tests/predict_load_test.js
 * 
 * Environment:
 *   ML_URL: ML service URL (default: http://localhost:5000)
 *   ML_API_KEY: API key for authentication (optional in dev)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for ML prediction
const predictErrorRate = new Rate('predict_errors');
const predictLatency = new Trend('predict_latency');
const predictSuccessRate = new Rate('predict_success');
const predictionsMade = new Counter('predictions_made');
const coldStartDetected = new Rate('cold_start_detected');

// Test configuration: 50 concurrent users for 3 minutes
export const options = {
    stages: [
        // Ramp-up: 0 -> 50 VUs over 30 seconds
        { duration: '30s', target: 50 },
        // Steady state: 50 VUs for 2 minutes
        { duration: '2m', target: 50 },
        // Ramp-down: 50 -> 0 VUs over 30 seconds
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        // CRITICAL: p95 latency must be < 100ms
        http_req_duration: ['p(95)<100', 'p(99)<150'],
        // Success rate must be >= 99%
        predict_success: ['rate>=0.99'],
        // No more than 1% errors
        predict_errors: ['rate<0.01'],
        // Predict latency tracking
        predict_latency: ['p(95)<100', 'p(99)<150'],
        // Cold start detection (should be 0% after first request)
        cold_start_detected: ['rate<0.01'],
    },
};

// Configuration from environment variables
const BASE_URL = __ENV.ML_URL || 'http://localhost:5000';
const API_KEY = __ENV.ML_API_KEY || '';

// Track if this is the first request (cold start detection)
let isFirstRequest = true;

/**
 * Generate realistic clinical biomarker payload for postmenopausal women (45-60 years)
 * Features: bmi, triglycerides, ldl, hdl, age, waist_circumference, smoking, activity, alcohol
 */
function generatePredictPayload() {
    // Age: 45-60 for postmenopausal women
    const age = 45 + Math.floor(Math.random() * 16);
    
    // BMI: 18.5-40 (Philippine Asia-Pacific cutoffs)
    const bmi = 22 + Math.random() * 15;
    
    // Triglycerides: 50-300 mg/dL (normal <150)
    const triglycerides = 80 + Math.floor(Math.random() * 150);
    
    // LDL: 70-200 mg/dL (optimal <100)
    const ldl = 80 + Math.floor(Math.random() * 80);
    
    // HDL: 30-80 mg/dL (good >=50 for women)
    const hdl = 35 + Math.floor(Math.random() * 35);
    
    // Waist circumference: 70-120 cm
    const waistCircumference = 75 + Math.random() * 30;
    
    // Lifestyle factors
    const smokingOptions = ['Never', 'Former', 'Current', 'Unknown'];
    const activityOptions = ['Sedentary', 'Moderate', 'Active', 'Unknown'];
    const alcoholOptions = ['None', 'Light', 'Moderate', 'Heavy', 'Unknown'];
    
    return {
        age: age,
        bmi: parseFloat(bmi.toFixed(1)),
        triglycerides: triglycerides,
        ldl: ldl,
        hdl: hdl,
        waist_circumference: parseFloat(waistCircumference.toFixed(1)),
        smoking: smokingOptions[Math.floor(Math.random() * smokingOptions.length)],
        activity: activityOptions[Math.floor(Math.random() * activityOptions.length)],
        alcohol: alcoholOptions[Math.floor(Math.random() * alcoholOptions.length)],
        family_history_diabetes: Math.random() > 0.5,
    };
}

/**
 * Setup function - runs once per VU
 */
export function setup() {
    console.log('ML Predict Load Test Setup');
    console.log(`Target: ${BASE_URL}`);
    
    // Health check to verify service is running
    const healthResponse = http.get(`${BASE_URL}/health`);
    
    const healthOk = check(healthResponse, {
        'ML service healthy': (r) => r.status === 200,
        'ML service has clinical model': (r) => {
            try {
                const body = r.json();
                return body.models_available?.clinical === true;
            } catch {
                return false;
            }
        },
    });
    
    if (!healthOk) {
        console.error('ML service health check failed. Ensure ML server is running:');
        console.error('  cd Ian_ML && python service/server.py');
    }
    
    return { healthOk };
}

/**
 * Main test function
 */
export default function (data) {
    // Build request headers
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }
    
    // Generate prediction payload
    const payload = JSON.stringify(generatePredictPayload());
    
    // Measure prediction latency
    const startTime = new Date();
    const response = http.post(`${BASE_URL}/predict`, payload, { headers });
    const endTime = new Date();
    const latencyMs = endTime - startTime;
    
    // Record metrics
    predictLatency.add(latencyMs);
    
    // Check for cold start (first request significantly slower)
    if (isFirstRequest && latencyMs > 200) {
        coldStartDetected.add(1);
        console.warn(`Cold start detected: ${latencyMs}ms on first request`);
    } else {
        coldStartDetected.add(0);
    }
    isFirstRequest = false;
    
    // Validate response
    const success = check(response, {
        'predict successful': (r) => r.status === 200,
        'response has predicted_status': (r) => {
            try {
                const body = r.json();
                return body.predicted_status !== undefined;
            } catch {
                return false;
            }
        },
        'response has risk_score': (r) => {
            try {
                const body = r.json();
                return body.risk_score !== undefined && 
                       body.risk_score >= 0 && 
                       body.risk_score <= 100;
            } catch {
                return false;
            }
        },
        'response has at_risk_probability': (r) => {
            try {
                const body = r.json();
                return body.at_risk_probability !== undefined &&
                       body.at_risk_probability >= 0 &&
                       body.at_risk_probability <= 1;
            } catch {
                return false;
            }
        },
        'response has model_type': (r) => {
            try {
                const body = r.json();
                return body.model_type !== undefined;
            } catch {
                return false;
            }
        },
        'latency under 100ms': () => latencyMs < 100,
        'latency under 150ms (p99 target)': () => latencyMs < 150,
    });
    
    predictSuccessRate.add(success ? 1 : 0);
    predictErrorRate.add(success ? 0 : 1);
    
    if (success) {
        predictionsMade.add(1);
    } else {
        console.error(`Prediction failed: ${response.status} - ${response.body}`);
    }
    
    // Log slow predictions for debugging
    if (latencyMs > 100) {
        console.warn(`Slow prediction: ${latencyMs}ms (VU: ${__VU}, Iteration: ${__ITER})`);
    }
    
    // Small sleep to simulate realistic request rate (50-200ms)
    sleep(0.05 + Math.random() * 0.15);
}

/**
 * Teardown function
 */
export function teardown(data) {
    console.log('ML Predict Load Test Completed');
}
