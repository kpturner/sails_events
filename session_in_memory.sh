# Will run the application in production mode but will 
# use memory for session storage instead of redis.  
# To be used when we have a problem and redis doesn't work
# (like in Windows for example)
export SESS_ADAPTOR=memory
node app.js --prod