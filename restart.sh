# Restarting services
service events-service stop
sleep 2s
service events-test stop
sleep 2s
service events-surrey stop
sleep 2s
service events-mtsfc stop
sleep 2s

service events-service start
echo Event service started
sleep 5s
service events-test start
echo Event test service started
sleep 5s
service events-surrey start
echo Event Surrey service started
sleep 5s
service events-mtsfc start
echo Event MTSFC service started
sleep 5s
