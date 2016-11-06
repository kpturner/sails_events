# Restarting services
service events-service stop
service events-test stop
service events-surrey stop
service events-service start
echo Event service started
service events-test stop
echo Event test service started
service events-surrey
echo Event Surrey service started