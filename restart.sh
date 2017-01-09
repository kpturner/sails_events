# Restarting services
service events-service stop
service events-test stop
service events-surrey stop
service events-mtsfc stop

service events-service start
echo Event service started
service events-test start
echo Event test service started
service events-surrey start
echo Event Surrey service started
service events-mtsfc start
echo Event MTSFC service started