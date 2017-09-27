//Account service

//Imports
const grpc = require('grpc');
const tableHelper = require('./helpers/menu.helper.js');
const proto = grpc.load(__dirname + '/proto/menu.proto');
const server = new grpc.Server();
const mongoose = require('mongoose');
const dbUrl = "mongodb://wildappsadminmwmenu:lgQ2NwyezeN7MyKD@menucluster-shard-00-00-jzzk4.mongodb.net:27017,menucluster-shard-00-01-jzzk4.mongodb.net:27017,menucluster-shard-00-02-jzzk4.mongodb.net:27017/MENU?ssl=true&replicaSet=MenuCluster-shard-0&authSource=admin";

mongoose.connect(dbUrl);

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open');
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});


//define the callable methods that correspond to the methods defined in the protofile
server.addService(proto.menu.MenuService.service, {
  getAll: function(call, callback){
    tableHelper.getAll(call, callback);
  },
  get: function(call, callback){
    tableHelper.get(call, callback);
  },
  create: function(call, callback){
    tableHelper.create(call,callback);
  },
  update: function(call, callback){
    tableHelper.update(call,callback);
  },
  delete: function(call, callback){
    tableHelper.delete(call, callback);
  },
  getActiveMenuByOwner: function(call, callback){
    tableHelper.getActiveMenuByOwner(call, callback);
  }

});

//Specify the IP and and port to start the grpc Server, no SSL in test environment
server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());

//Start the server
server.start();
console.log('gRPC server running on port: 50051');
