var http = require('http');
var url = require('url');
var amqp = require('amqplib/callback_api');


http.createServer(function(request, response) {
    var headers = request.headers;
    var method = request.method;
    var requestUrl = url.parse(request.url, true);
    var body = [];
    request.on('error', function(err) {
        console.error(err);
    }).on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {

        body = Buffer.concat(body).toString();
        payload = JSON.parse(body);

        var now = (new Date(Date.now())).toISOString();
        console.log('Received webhook id: ' + payload.webhook.id + ' at ' + now);

        amqp.connect(process.env.AMQP_SERVER, function(err, conn) {
            conn.createChannel(function(err, ch) {

                var q = (process.env.AMQP_PREFIX || 'queue') + requestUrl.pathname;

                var message = {
                    url : requestUrl,
                    method : method,
                    headers : headers,
                    body : body,
                };

                ch.assertQueue(q, {durable: true});
                ch.sendToQueue(q, new Buffer(JSON.stringify(message)));

                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end('ok');
            });
        });

    });
}).listen((process.env.PORT || 5000));

var now = (new Date(Date.now())).toISOString();
console.log('Server started at ' + now);
