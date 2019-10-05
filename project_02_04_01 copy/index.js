/*

Author: Michael Wood
Date: 1/17/19
Filename: index.js

*/


//requiring in the certain module
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var authenticater = require('./authenticater.js')
var config = require('./config.json');
var  url = require('url');
var querystring = require('querystring');
var async = require('async');
var storage = require('./storage.js');
storage.connect();


//helps with urls 


//adds in middlewear everywhere on its level witha slash
app.use(require('cookie-parser')());

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

setInterval( function() {
    if (storage.connected) {
        console.log("clearing cache.");
        storage.deleteFriends();
    }    
}, 1000 * 60 * 5);


app.get('/auth/callback', function(req, res) {
    res.send("<h3>Hello I am an OAuth callback!</h3>");
});

//gets the request tokens and uses them to gain acess then wite a tweet
app.get('/tweet', function(req, res) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/statuses/update.json";
    authenticater.post(url, credentials.access_token, credentials.access_token_secret, 
    {
        status: "first tweet done with code and local tunnels and not actually on twitter"
    }, function(error, data) {
        if (error) {
            return res.status(400).send(error);
        } 
        res.send("tweet sucessful!");
    });
});

//pulls up every tweet BMW has ever sent
app.get('/search', function(req, res) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/search/tweets.json";
    var query = querystring.stringify({ q: 'BMW'});
    url += '?' + query;
    authenticater.get(url, credentials.access_token, credentials.access_token_secret, function(error, data) {
       if (error) {
           return res.status(400).send(error);
       } 
       res.send(data);
    });
});

//opens the page when requested to autherize the user
app.get('/auth/twitter', authenticater.redirectToTwitterLoginPage);

//runs the friends page and pulls up your followers in kinda a junk way
app.get('/friends', function(req, res) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/friends/list.json";
    if (req.query.cursor) {
        url += '?' + querystring.stringify({ cursor: req.query.cursor });
    }
    authenticater.get(url, credentials.access_token, credentials.access_token_secret,
    function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(data);
    });
});

app.get('/followers', function(req, res) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/followers/list.json";
    if (req.query.cursor) {
        url += '?' + querystring.stringify({ cursor: req.query.cursor });
    }
    authenticater.get(url, credentials.access_token, credentials.access_token_secret,
    function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(data);
    });
});

app.get('/timeline', function(req, res) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/statuses/user_timeline.json";
    if (req.query.cursor) {
        url += '?' + querystring.stringify({ cursor: req.query.cursor });
    }
    authenticater.get(url, credentials.access_token, credentials.access_token_secret,
    function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(data);
    });
});


app.get('/directmessages', function(req, res) {
    var credentials = authenticater.getCredenitals();
    var url = "https://api.twitter.com/1.1/direct_messages/events/new.json";
    var twitter_id = "2336907289";
    var content = "yo testing code"; 
    url += '?' + querystring.stringify({message_create: {target: twitter_id}, message_data:{content}});
    authenticater.post(url, credentials.access_token, credentials.access_token_secret,
    function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(data);
    });
});


app.get('/allfriends', function(req, res) {
    renderMainPageFromTwitter(req, res);
});


app.get('/retweets', function(req, res) {
    retweetsofme(req, res);
});

//breaks up the url and then runs it on the request token path
app.get(url.parse(config.oauth_callback).path, function(req, res) {
    authenticater.authenticate(req, res, function(err) {
        if (err) {
           res.redirect('/login');
        }else{
            res.redirect('/');
        }
    });
});

function renderMainPageFromTwitter(req, res) {
    var credentials = authenticater.getCredenitals();
    //async waterfall to control flow
    async.waterfall([
        //get ids
        function(callback) {
           var cursor = -1;
           var ids = [];
           console.log("ids.length: " + ids.length);
           async.whilst(function() {
               return cursor != 0;

        },
        //parses data and helps it display and count your friend total
        function(callback) {
            var url = "https://api.twitter.com/1.1/friends/ids.json";
            url += "?" + querystring.stringify({user_id: credentials.twitter_id, cursor: cursor});
            authenticater.get(url, credentials.access_token, credentials.access_token_secret, 
                function(error, data) {
                if (error) {
                    return res.status(400).send(error);
                }
                data = JSON.parse(data);
                cursor = data.next_cursor_str;
                ids = ids.concat(data.ids);
                console.log("ids.length: " + ids.length);
                callback();
            });
        }, 
        //calls the function back 
        function(error) {
            console.log("last callback");
            if (error) {
                return res.status(500).send(error);
            }
            console.log(ids);
            callback(null, ids)
        });
        },
        //lookup friends data
        function(ids, callback) {
            var getHundredIds = function(i) {
                return ids.slice(100*i, Math.min(ids.length, 100*(i+1)));
            };
            var requestsNeeded = Math.ceil(ids.length/100);
            async.times(requestsNeeded, function(n, next) {
              var url =  "https://api.twitter.com/1.1/users/lookup.json";
              url += "?" + querystring.stringify({ user_id: getHundredIds(n).join(",")});
              authenticater.get(url, credentials.access_token, credentials.access_token_secret, 
                function(error, data) {
                    if (error) {
                        return res.status(400).send(error);
                    }
                    var friends = JSON.parse(data);
                    next(null, friends);
                    });
                },
                    function (error, friends) {
                        friends = friends.reduce(function(previousValue, currentValue, currentIndex, array) {
                            return previousValue.concat(currentValue);
                        }, []);
                        friends.sort(function(a, b) {
                            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                    });
                    friends = friends.map(function(friend) {
                        return {
                            twitter_id: friend.id_str, 
                            for_user: credentials.twitter_id,
                            name: friend.name,
                            screen_name: friend.screen_name,
                            location: friend.location,
                            profile_image_url: friend.profile_image_url
                        }
                    });
                    res.render('index', {friends: friends});
                    if (storage.connected) {
                        storage.insertFriends(friends);
                    }
                    console.log('friends.length', friends.length);
                });
        }
    ]);
}

function retweetsofme(req, res) {
    var credentials = authenticater.getCredenitals();
    //async waterfall to control flow
    async.waterfall([
        //get ids
        function(callback) {
           var cursor = -1;
           var ids = [];
           console.log("ids.length: " + ids.length);
           async.whilst(function() {
               return cursor != 0;

        },
        //parses data and helps it display and count your friend total
        function(callback) {
            var url = "https://api.twitter.com/1.1/statuses/retweets_of_me.json";
            url += "?" + querystring.stringify({user_id: credentials.twitter_id, cursor: cursor});
            authenticater.get(url, credentials.access_token, credentials.access_token_secret, 
                function(error, data) {
                if (error) {
                    return res.status(400).send(error);
                }
                data = JSON.parse(data);
                cursor = data.next_cursor_str;
                ids = ids.concat(data.ids);
                console.log("ids.length: " + ids.length);
                callback();
            });
        }, 
        //calls the function back 
        function(error) {
            console.log("last callback");
            if (error) {
                return res.status(500).send(error);
            }
            console.log(ids);
            callback(null, ids)
        });
        },
        //lookup friends data
        function(ids, callback) {
            var getHundredIds = function(i) {
                return ids.slice(100*i, Math.min(ids.length, 100*(i+1)));
            };
            var requestsNeeded = Math.ceil(ids.length/100);
            async.times(requestsNeeded, function(n, next) {
              var url =  "https://api.twitter.com/1.1/users/lookup.json";
              url += "?" + querystring.stringify({ user_id: getHundredIds(n).join(",")});
              authenticater.get(url, credentials.access_token, credentials.access_token_secret, 
                function(error, data) {
                    if (error) {
                        return res.status(400).send(error);
                    }
                    var retweets = JSON.parse(data);
                    next(null, retweets);
                    });
                },
                    function (error, retweets) {
                        retweets = retweets.reduce(function(previousValue, currentValue, currentIndex, array) {
                            return previousValue.concat(currentValue);
                        }, []);
                        retweets.sort(function(a, b) {
                            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                    });
                    retweets = retweets.map(function(retweet) {
                        return {
                            twitter_id: retweet.id_str, 
                            for_user: credentials.twitter_id,
                            name: retweet.name,
                            screen_name: retweet.screen_name,
                            location: retweet.location,
                            profile_image_url: retweet.profile_image_url
                        }
                    });
                    res.render('index', {retweets: retweets});
                    if (storage.connected) {
                        storage.insertFriends(retweets);
                    }
                    console.log('friends.length', retweets.length);
                });
        }
    ]);
}


//creates multpile response things that are filled with other code and functions
app.get('/login', function(req, res) {
    if (storage.connected) {
        console.log("deleting friend collection on log in");
        // storage.deleteFriends();
    }
    res.render('login'); 
});
//makes it so you can clear crediantals and send  them back to the begging 
app.get('/logout', function(req, res) {
    authenticater.clearCredenitals();
    res.clearCookie('twitter_id');9
    if (storage.connected) {
        console.log("deleting friend collection on log out");
        storage.deleteFriends();
    }
    res.redirect('/login'); 
});

function ensureLoggedIn(req, res, next) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret
    || !credentials.twitter_id) {
        return res.sendStatus(401);
    }
    res.cookie('twitter_id', credentials.twitter_id, {httponly: true});
    next();
}

app.get('/friends/:uid/notes', ensureLoggedIn, function(req, res) {
    var credentials = authenticater.getCredenitals();
    storage.getNotes(credentials.twitter_id, req.params, function(error, notes) {
        if (error) {
            return res.status(500).send(err);
        }
        res.send(notes);
    });
});


//sets up front page for the API
app.get('/', function(req, res) {
    var credentials = authenticater.getCredenitals();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.redirect('login');
    }
    if (!storage.connected()) {
        console.log("Loading friends from Twitter.");
        return renderMainPageFromTwitter(req, res);
    }
    console.log();
    storage.getFriends(credentials.twitter_id, function(error, friends) {
       if (error) {
           return res.status(500).send(error);
       } 
       if (friends.length > 0) {
           console.log("Friends successfully loaded from MongoDB.");
           friends.sort(function(a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase);    
           });
           res.render('index');
       }
       else{
           console.log("Loading friends from twitter.");
           renderMainPageFromTwitter(req,res);

       }
    });
});

//looking for post
app.post('/friends/:uid/notes', ensureLoggedIn, function(req, res, next) {
    storage.insertNote(req.cookies.twitter_id, req.params, req.body.content, function(error, note) {
        if (error) {
            return res.status(500).send(err);
        }
        res.send(note);
    });
});

//makes route to let you update and change your notes
app.put('/friends/:uid/notes/:noteid', ensureLoggedIn, function(req, res) {
    storage.updateNote(req.params.noteid, req.cookies.twitter_id, req.body.content, function(error, note) {
        if (error) {
            return res.sendStatus(500).send(error);
        }
        res.send({
            _id: note._id,
            content: note.content
        })
    });

});

//makes the route to delete notes
app.delete('/friends/:uid/notes/:noteid', ensureLoggedIn, function(req, res) {
    storage.deleteNote(req.params.noteid, req.cookies.twitter_id, function(error, note) {
        if (error) {
            return res.sendStatus(500).send(error);
        }
        res.send(200);
    });

});


//listens for when the server runs to log the info
app.listen(config.port, function() {
    console.log("Server is listening on localhost:%s", config.port);
    console.log('oAuth callback: ' + url.parse(config.oauth_callback).hostname + 
    url.parse(config.oauth_callback).path);

});