/*

Author: Michael Wood
Date: 1/25/19
Filename: authenticater.js

*/

var OAuth = require('oauth').OAuth;
var config = require('./config.json');

//rewuiring in Oauth and pulling info from the config file
var oauth = new OAuth(
    config.request_token_url,
    config.access_token_url,
    config.consumer_key,
    config.consumer_secret,
    config.oauth_version,
    config.oauth_callback,
    config.oauth_signature,
);

var twitterCredentials = {
    oauth_token: "",
    oauth_token_secret: "",
    access_token: "",
    access_token_secret: "",
    twitter_id: ""
}
//this runs the function in the other page and also creates to pass on and on
module.exports = {
    getCredenitals: function(){
        return twitterCredentials;
    },
    clearCredenitals: function(){
        twitterCredentials.oauth_token = "";
        twitterCredentials.oauth_token_secret = "";
        twitterCredentials.access_token = "";
        twitterCredentials.access_token_secret = "";
        twitterCredentials.twitter_id = "";
    },
    //target api to get with a get
    get: function(url, access_token, access_token_secret, callback){
            oauth.get.call(oauth, url, access_token, access_token_secret, callback);
    },
    post: function(url, access_token, access_token_secret, body, callback){
        oauth.post.call(oauth, url, access_token, access_token_secret, body, callback);
    },
    redirectToTwitterLoginPage: function(req, res) {
        oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
            if (error) {
                console.log(error);
                res.send("Authentication failed!!!!");
            }else{
                twitterCredentials.oauth_token = oauth_token;
                twitterCredentials.oauth_token_secret = oauth_token_secret;
                res.redirect(config.authorize_url + '?oauth_token=' + oauth_token);
            }
        });
    },
    //if the funtion errs out then it tells us in console that its missing a few keys
    authenticate: function(req, res, callback){
        if (!(twitterCredentials.oauth_token && twitterCredentials.oauth_token_secret &&
            req.query.oauth_verifier)) {
            return callback("Request doesnt have all required keys!!!");
        }
        // twitterCredentials.oauth_token = "";
        // twitterCredentials.oauth_token_secret = "";
        oauth.getOAuthAccessToken(twitterCredentials.oauth_token, twitterCredentials.oauth_token_secret,
        req.query.oauth_verifier, function(error, oauth_access_token, oauth_access_token_secret, results) {
            if (error) {
                return callback(error);
            }
            //
            oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json', oauth_access_token,
        oauth_access_token_secret, function(error, data) {
            if (error) {
                console.log(error);
                return callback(error);
            }
            data = JSON.parse(data);
            twitterCredentials.access_token = oauth_access_token;
            twitterCredentials.access_token_secret = oauth_access_token_secret;
            twitterCredentials.twitter_id = data.id_str;
            console.log(data);
            return callback();
        });

        });
    }
}