REM Will run the application in production mode but will 
REM use memory for session storage instead of redis.  
REM To be used when we have a problem and redis doesn't work
REM (like in Windows for example)
set SESS_ADAPTOR=memory
node app.js --prod