/*

Author: Michael Wood
Date: 2/13/19
Filename: storage.js

*/

//global
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var url = "mongodb://localhost:27017";
var dbName = 'twitter_notes';
var database;

module.exports = {
    connect: function () {
        MongoClient.connect(url, function (error, client) {
            if (error) {
                return console.log("Error!!!!: " + error)
            }
            database = client.db(dbName);
            console.log("connected to database: " + dbName);
        });
    },
    connected: function () {
        return typeof database != 'undefined';
    },
    //insert friends into databasei
    insertFriends: function (friends) {
        database.collection('friends').insert(friends, function (error) {
            if (error) {
                console.log("cannoct insert friends into database")
            }
        });
    },
    //gets your friend list
    getFriends: function (userID, callback) {
        var curser = database.collection('friends').find({
            for_user: userID
        });
        curser.toArray(callback);
    },
    //deletes friends on logout and in
    deleteFriends: function () {
        database.collection('friends').remove(({}), function (error) {
            if (error) {
                console.log("cannot remove friends from database.");
            }
        });
    },
    //gets all the notes we have created as we pulled in information 
    getNotes: function name(ownerid, friendid, callback) {
        var curser = database.collection('notes').find({
            owner_id: ownerid,
            friend_id: friendid
        });
        curser.toArray(function (error, notes) {
            if (error) {
                return callback(error);
            }
            callback(null, notes.map(function (note) {
                return {
                    _id: note._id,
                    content: note.content
                }
            }));

        });
    },
//posts the the conntent to the Mongo 
    insertNote: function (ownerid, friendid, content, callback) {
        database.collection('notes').insert({
                owner_id: ownerid,
                friend_id: friendid,
                content: content
            },
            function (err, result) {
                if (err) {
                    return callback(err, result);
                }
                callback(null, {
                    _id: result.ops[0]._id,
                    content: result.ops[0].content
                });
            });
    }, 

    updateNote: function(noteId, ownerId, content, callback) {
        database.collection('notes').updateOne({
            _id: new ObjectID(noteId), 
            owner_id: ownerId
        },
        {
            $set: { content: content }
        }, function (error, result) {
            if (error) {
                return callback(error);
            }
            database.collection('notes').findOne({
                _id: new ObjectID(noteId)
            }, callback)
        });


    },

    deleteNote: function(noteId, ownerId, callback) {
        database.collection('notes').deleteOne({
            _id: new ObjectID(noteId), 
            owner_id: ownerId
        }, callback);
    }

}