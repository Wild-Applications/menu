//Account service

//Imports
const grpc = require('grpc');
const tableHelper = require('./helpers/menu.helper.js');
const proto = grpc.load(__dirname + '/proto/menu.proto');
const server = new grpc.Server();
const mongoose = require('mongoose');
const dbUrl = "mongodb://" + process.env.DB_USER + ":" + process.env.DB_PASS + "@" + process.env.DB_HOST;
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
  updateContents: function(call, callback){
    tableHelper.update(call,callback);
  },
  delete: function(call, callback){
    tableHelper.delete(call, callback);
  },
  deleteAll: function(call, callback){
    tableHelper.deleteAll(call, callback);
  },
  removeProduct: function(call, callback){
    tableHelper.removeProduct(call, callback);
  },
  getActiveMenuByOwner: function(call, callback){
    tableHelper.getActiveMenuByOwner(call, callback);
  },
  makeActive: function(call, callback){
    tableHelper.makeActive(call, callback);
  }

});

//Specify the IP and and port to start the grpc Server, no SSL in test environment
server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());

//Start the server
server.start();
console.log('gRPC server running on port: 50051');

process.on('SIGTERM', function onSigterm () {
  console.info('Got SIGTERM. Graceful shutdown start', new Date().toISOString())
  server.tryShutdown(()=>{
    process.exit(1);
  })
});
