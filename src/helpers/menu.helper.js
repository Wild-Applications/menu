
//imports
var jwt = require('jsonwebtoken'),
Menu = require('../models/menu.schema.js')
Active = require('../models/active.schema.js');



//var jwt = require('jsonwebtoken');
//var tokenService = require('bleuapp-token-service').createTokenHandler('service.token', '50051');

var helper = {};

helper.getAll = function(call, callback){
  //protected route so verify token;
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback({message:err},null);
    }
    Menu.find({ owner: token.sub}).sort({active: -1}).exec(function(err, resultMenus){
      if(err){
        return callback({message:'err'}, null);
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
      return callback({message:err},null);
    }
    Menu.findOne({ _id: call.request._id }).exec(function(err, resultMenu){
      if(err){
        return callback({message:'err'}, null);
      }
      var returnMenu = formatMenu(resultMenu);

      getProducts(resultMenu.contents, call.metadata).then(allData => {
        console.log("Returned from Products function " + JSON.stringify(allData));
        returnMenu.contents = allData;
        return callback(null, returnMenu);
      }, error => {
        callback({message:'something went wrong when getting products'},null);
      })
    })
  });
}

helper.getActiveMenuByOwner = function(call, callback){
  console.log('got here');
  Active.findOne({owner:call.request.owner}, function(activeErr, result){
    if(activeErr){
      console.log(activeErr);
      callback({message:'error retrieving active menu'}, null);
    }
    if(result){
      console.log('active menu found');
      Menu.findOne({_id: result.menu}, function(menuErr, resultMenu){
        if(menuErr){
          console.log('menu find err');
          return callback({message:'err'}, null);
        }
        console.log(resultMenu);
        var returnMenu = formatMenu(resultMenu);

        getProducts(resultMenu.contents, call.metadata).then(allData => {
          console.log("Returned from Products function " + JSON.stringify(allData));
          returnMenu.contents = allData;
          return callback(null, returnMenu);
        }, error => {
          callback({message:JSON.stringify(error)},null);
        })
      })
    }else{
      callback({message:'error retrieving active menu'}, null);
    }
  });
}

helper.create = function(call, callback){
  //validation handled by database
  var newMenu = new Menu(call.request);
  newMenu.save(function(err, result){
    if(err){
      console.log(err);
      return callback({message:'err'},null);
    }
    return callback(null, {_id: result._id.toString()});
  });
}

helper.update = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback({message:err},null);
    }

    Menu.findOneAndUpdate({ _id: call.request._id}, call.request, function(err, menuReply){
      if(err){
        console.log(err);
        return callback({message:'err'}, null);
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
      return callback({message:err},null);
    }

    Menu.findByIdAndRemove(call.request._id, function(err, menuReply){
      if(err){
        console.log(err);

        return callback({message:'err'}, null);
      }

      return callback(null, {});
    })
  });
}

helper.makeActive = function(call, callback){
  jwt.verify(call.metadata.get('authorization')[0], process.env.JWT_SECRET, function(err, token){
    if(err){
      return callback({message:'error reading token'},null);
    }
    Active.findOne({owner: token.sub}, function(activeMenuRetrieveError, active){
      console.log(active);
      if(activeMenuRetrieveError){
        callback({message:'Error finding the active menu for this owner'},null);
      }
      if(!active){
        active = new Active({owner:token.sub});
      }
      active.menu = call.request._id;
      active.save(function(err){
        if(err){
          callback({message:'error saving the new active menu'},null);
        }
        callback(null,{madeActive:true});
      });
    });
  });
}

function getProducts(contentsObj, metadata){
  var grpc = require("grpc");
  var productDescriptor = grpc.load(__dirname + '/../proto/product.proto').product;
  var productClient = new productDescriptor.ProductService('service.product:1295', grpc.credentials.createInsecure());

  var productsCall = function(section, metadata){
    return new Promise(function(resolve, reject){
      productClient.getBatch(section.products, metadata, function(err, results){
        if(err){return reject(err)}
        section.products = results;
        var test = {};
        test.title = section.title;
        test.products = results.products;
        console.log("Results " + JSON.stringify(results));
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
