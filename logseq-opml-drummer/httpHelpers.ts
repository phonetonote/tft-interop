import * as request from "request";

function buildParamList(paramtable, flPrivate) {
  var s = "";
  if (flPrivate) {
    paramtable.flprivate = "true";
  }
  for (var x in paramtable) {
    if (paramtable[x] !== undefined) {
      //8/4/21 by DW
      if (s.length > 0) {
        s += "&";
      }
      s += x + "=" + encodeURIComponent(paramtable[x]);
    }
  }
  return s;
}

export function httpReadUrl(url, callback) {
  request(url, function (err, response, data) {
    if (!err && response.statusCode == 200) {
      callback(undefined, data.toString());
    } else {
      if (!err) {
        err = {
          message:
            "Can't read the file because there was an error. Code == " +
            response.statusCode +
            ".",
        };
      }
      callback(err);
    }
  });
}
function httpPost(url, data, callback) {
  var theRequest = {
    method: "POST",
    body: data,
    url: url,
  };
  request(theRequest, function (err, response, data) {
    if (err) {
      callback(err);
    } else {
      if (response.statusCode != 200) {
        const message =
          "The request returned a status code of " + response.statusCode + ".";
        callback({ message });
      } else {
        callback(undefined, data);
      }
    }
  });
}

export function serverpost(
  config,
  path,
  params,
  flAuthenticated,
  filedata,
  callback
) {
  var whenstart = new Date();
  if (params === undefined) {
    params = new Object();
  }
  if (flAuthenticated) {
    //1/11/21 by DW
    params.oauth_token = config.oauth_token;
    params.oauth_token_secret = config.oauth_token_secret;
  }
  var url =
    config.urlTwitterServer + path + "?" + buildParamList(params, false);
  httpPost(url, filedata, callback);
}
