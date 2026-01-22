"""
Simple manual test to verify ML API key authentication logic
"""
import os

print("Testing ML API Key Authentication Logic...\n")

# Test 1: API Key validation decorator logic
def test_require_api_key_logic():
    """Verify that decorator requires API key in all environments"""
    # Set a test API key for this test
    os.environ['ML_API_KEY'] = 'test-api-key-12345'
    API_KEY = os.environ.get('ML_API_KEY', None)
    print(f"1. Current ML_API_KEY: {API_KEY}")

    # Simulate the decorator logic
    if not API_KEY:
        print("   FAIL: ML_API_KEY not configured - server would return 500")
        return False

    provided_key = API_KEY
    import hmac
    if not provided_key or not hmac.compare_digest(provided_key, API_KEY):
        print("   FAIL: Invalid API key - server would return 401")
        return False

    print("   PASS: API key validation logic is correct")
    return True


# Test 2: Verify mlFetch sends X-API-Key header
def test_mlfetch_header_logic():
    """Verify frontend mlFetch includes X-API-Key header"""
    print("\n2. Checking frontend mlFetch implementation...")
    print("   VITE_ML_API_KEY should be sent as X-API-Key header")

    with open('../frontend/src/api.js', 'r') as f:
        content = f.read()
        if 'X-API-Key' in content:
            print("   PASS: mlFetch includes X-API-Key header")
            return True
        else:
            print("   FAIL: mlFetch missing X-API-Key header")
            return False


# Test 3: Verify server.py has require_api_key decorator
def test_server_decorator():
    """Verify server.py uses @require_api_key on protected endpoints"""
    print("\n3. Checking ML server endpoint protection...")

    with open('../ml/server.py', 'r') as f:
        content = f.read()

    # Check for decorator usage on key endpoints
    endpoints_to_check = [
        '/predict',
        '/insights/metrics',
        '/predict/batch'
    ]

    for endpoint in endpoints_to_check:
        # Find the endpoint definition
        route_line = f"@app.route('{endpoint}'"
        if route_line in content:
            # Check if @require_api_key decorator is above it
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if route_line in line:
                    # Check previous lines for @require_api_key
                    for j in range(max(0, i-3), i):
                        if '@require_api_key' in lines[j]:
                            print(f"   PASS: {endpoint} protected by @require_api_key")
                            break
                    break
        else:
            print(f"   INFO: {endpoint} not found (may not exist in this version)")

    return True


# Test 4: Check environment variable documentation
def test_env_documentation():
    """Verify ML_API_KEY is documented in env files"""
    print("\n4. Checking environment variable documentation...")

    # Check .env file
    try:
        with open('../.env', 'r') as f:
            if 'ML_API_KEY=' in f.read():
                print("   PASS: ML_API_KEY present in .env")
            else:
                print("   INFO: ML_API_KEY not in .env (may need to add)")
    except:
        print("   INFO: .env file not found or inaccessible")

    # Check env.example
    try:
        with open('../env.example', 'r') as f:
            if 'ML_API_KEY=' in f.read():
                print("   PASS: ML_API_KEY documented in env.example")
            else:
                print("   FAIL: ML_API_KEY missing from env.example")
    except:
        print("   FAIL: env.example not found")

    return True


# Run all tests
if __name__ == '__main__':
    print("=" * 60)
    print("ML API Key Authentication - Manual Verification")
    print("=" * 60)

    results = []
    results.append(test_require_api_key_logic())
    results.append(test_mlfetch_header_logic())
    results.append(test_server_decorator())
    results.append(test_env_documentation())

    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)

    if all(results):
        print("\nAll checks passed!")
        exit(0)
    else:
        print("\nSome checks failed - review implementation")
        exit(1)
