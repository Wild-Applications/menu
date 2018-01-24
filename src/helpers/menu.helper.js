
//imports
var jwt = require('jsonwebtoken'),
Menu = require('../models/menu.schema.js')
Active = require('../models/active.schema.js'),
errors = require('../errors/errors.json');


var grpc = require("grpc");
var productDescriptor = grpc.load(__dirname + '/../proto/product.proto').product;
var productClient = new productDescriptor.ProductService('service.product:1295', grpc.credentials.createInsecure());

var premisesDescriptor = grpc.load(__dirname + '/../proto/premises.proto').premises;
var premisesClient = new premisesDescriptor.PremisesService('service.premises:1295', grpc.credentials.createInsecure());
//var jwt = require('jsonwebtoken');
//var tokenService = require('bleuapp-token-service').createTokenHandler('service.token', '50051');

var helper = {};

helper.getAll = function(call, callback){
  //protected route so verify token;
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback(errors['0002'],null);
    }
    Menu.find({ owner: token.sub}).sort({active: -1}).exec(function(err, resultMenus){
      if(err){
        return callback(errors['0001'], null);
      }

      Active.findOne({owner: token.sub}, function(err, activeId){
        if(err || !activeId){
          activeId = "";
        }else{
          activeId = activeId.menu;
        }
        var results = [];
        resultMenus.forEach(function(menu){
          results[results.length] = formatMenu(menu, activeId, call);
        });

        return callback(null, results);
      });
    })
  });
}

function formatMenu(menu, activeId){
  var formatted = {};
  formatted._id = menu._id.toString();
  formatted.name = menu.name;
  formatted.description = menu.description;
  if(activeId){
    formatted.active = (menu._id.toString() == activeId.toString());
  }
  return formatted;
}

helper.get = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback(errors['0002'],null);
    }
    Menu.findOne({ _id: call.request._id }).exec(function(err, resultMenu){
      if(err){
        return callback(errors['0001'], null);
      }
      var returnMenu = formatMenu(resultMenu);

      getProducts(resultMenu.contents, call.metadata).then(allData => {
        returnMenu.contents = allData;
        return callback(null, returnMenu);
      }, error => {
        callback(errors['0003'],null);
      })
    })
  });
}

helper.getActiveMenuByOwner = function(call, callback){
  Active.findOne({owner:call.request.owner}, function(activeErr, result){
    if(activeErr){
      callback(errors['0004'], null);
    }
    if(result){
      Menu.findOne({_id: result.menu}, function(menuErr, resultMenu){
        if(menuErr){
          return callback(errors['0004'], null);
        }
        var returnMenu = formatMenu(resultMenu);
        getProducts(resultMenu.contents, call.metadata).then(allData => {
          returnMenu.contents = allData;
          return callback(null, returnMenu);
        }, error => {
          callback(errors['0003'],null);
        })
      })
    }else{
      callback(errors['0004'], null);
    }
  });
}

helper.create = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback(errors['0002'],null);
    }
    //validation handled by database
    var toCreate = {};
    toCreate.owner = token.sub;
    toCreate.name = call.request.name;
    toCreate.description = call.request.description;
    if(call.request.contents){
      toCreate.contents = call.request.contents;
    }
    if(call.request.active){
      toCreate.active = call.request.active;
    }
    var newMenu = new Menu(toCreate);
    newMenu.save(function(err, result){
      if(err){
        return callback(errors['0005'],null);
      }
      return callback(null, {_id: result._id.toString()});
    });
  });
}

helper.update = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      console.log(err);
      return callback(errors['0002'],null);
    }

    Menu.findOneAndUpdate({ _id: call.request._id}, call.request, function(err, menuReply){
      if(err){
        return callback(errors['0006'], null);
      }
      var menuToReturn = {};
      menuToReturn._id = menuReply._id.toString();
      return callback(null, menuToReturn);
    })
  });
}

helper.delete = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback(errors['0002'],null);
    }

    Menu.findByIdAndRemove(call.request._id, function(err, menuReply){
      if(err){
        return callback(errors['0007'], null);
      }

      //need to check if this was the active menu
      if(menuReply){
        Active.findOneAndRemove({menu : menuReply._id}, function(err, activeReply){
          if(err){
            //weve already deleted the menu so it doesnt matter too much if this failed
          }
          if(activeReply){
            premisesClient.close({}, call.metadata, (err, response) => {
              if(err){
                //again there isnt much we can do.
              }

              return callback(null, {});
            });
          }else{
            return callback(null, {});
          }
        });
      }else{
        return callback(null, {});
      }
    })
  });
}

helper.makeActive = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback(errors['0002'],null);
    }
    Active.findOne({owner: token.sub}, function(activeMenuRetrieveError, active){
      if(activeMenuRetrieveError){
        return callback(errors['0008'],null);
      }

      if(!active){
        active = new Active({owner:token.sub});
      }
      active.menu = call.request._id;
      active.save(function(err){
        if(err){
          return callback(errors['0008'],null);
        }
        callback(null,{madeActive:true});
      });
    });
  });
}

function getProducts(contentsObj, metadata){
  var productsCall = function(section, metadata){
    return new Promise(function(resolve, reject){
      productClient.getBatch(section.products, metadata, function(err, results){
        if(err){return reject(err)}
        section.products = results;
        var test = {};
        test.title = section.title;
        test.products = results.products;
        return resolve(test);
      });
    })
  }


  var requests = [];
  contentsObj.forEach(function(section){
    for(var i=0;i<section.products.length;i++){
      section.products[i] = section.products[i].toString();
    }
    requests[requests.length] = productsCall(section, metadata);
  })
  //return requests;

  return Promise.all(requests);
}


module.exports = helper;
