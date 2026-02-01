# Monitor all logs
echo "Waiting for logs to appear..."
while [ ! -f logs/backend.log ] || [ ! -f logs/ml-server.log ]; do
    sleep 1
done
echo "Tailing logs..."
tail -f logs/ml-server.log logs/backend.log logs/frontend.log
