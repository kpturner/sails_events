# To start the application use 'bash  pgsl.sh start'
# To stop the application use 'bash pgsl.sh stop' 


SESS_ADAPTOR=memory SMTP_SENDER='PGSL Dining <dining@9263dining.org.uk>' NODE_ENV=production  node_modules/forever/bin/forever $1 app.js