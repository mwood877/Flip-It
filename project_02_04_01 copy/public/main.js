/*

Author: Michael Wood
Date: 1/25/19
Filename: main.js

*/

(function () {
    var selectedUserId;
    var cache = {};
    //alert("I am saying hello!!! im a iife");

    function startup() {
        var friends = document.getElementsByClassName('friend');
        //loops through looking where to put lis and attaching document and attach children to 
        for (var i = 0; i < friends.length; i++) {
            console.log("friend number: ", i)
            friends[i].addEventListener('click', function () {
                for (var j = 0; j < friends.length; j++) {
                    friends[j].className = 'friend';
                }
                this.className += ' active';
                selectedUserId = this.getAttribute('uid');
                console.log("twitter id: ", selectedUserId);
                //attches the notes document fragement to the il
                var notes = getNotes(selectedUserId, function (notes) {
                    var docFragment = document.createDocumentFragment();
                    var notesElements = createNoteElements(notes);
                    notesElements.forEach(function (element) {
                        docFragment.appendChild(element);
                    });
                    //
                    var newNoteButton = createAddNoteButton();
                    docFragment.appendChild(newNoteButton);
                    document.getElementById('notes').innerHTML = "";
                    document.getElementById('notes').appendChild(docFragment);
                });
            });
        }
    }
    //getNote runs the expression  to reicieve and parse the data
    function getNotes(userId, callback) {
        if (cache[userId]) {
            return callback(cache[userId]);
        }
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            //waits for the correct readyState to catch the notes 
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var notes = JSON.parse(xhttp.responseText || []);
                cache[userId] = notes;
                callback(notes);

            }
        };
        //create web address
        xhttp.open('GET', '/friends/' + encodeURIComponent(userId) + '/notes/');
        xhttp.send();
    }

    // posts the new note to the server with the data we earlier parsed
    function postNewNote(userId, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var serverNote = JSON.parse(xhttp.responseText || {});
                cache[userId].push(serverNote);
                callback(serverNote);

            }
        }
        //makes a route to post notes
        xhttp.open('POST', '/friends/' + encodeURIComponent(userId) + '/notes');
        xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhttp.send(JSON.stringify(note));
    }

    function putNote(userid, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var serverNote = JSON.parse(xhttp.responseText || {});
                callback(serverNote);
            }
        }
        //makes a route to update notes
        xhttp.open('PUT', '/friends/' + encodeURIComponent(userid) + '/notes/' +
            encodeURIComponent(note._id), true);
        xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhttp.send(JSON.stringify(note));
    }

    //deletes notes from the database
    function deleteNote(userid, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                cache[userid] = cache[userid].filter(function (localNote) {
                    return localNote._id != note._id;
                });
                callback();
            }
        }
        //makes a route to delete notes
        xhttp.open('DELETE', '/friends/' + encodeURIComponent(userid) + '/notes/' +
            encodeURIComponent(note._id), true);
        xhttp.send(JSON.stringify(note));
    }

    //creates the li for later and attachs the correct classes 
    function createNoteElements(notes) {
        return notes.map(function (note) {
            var element = document.createElement('li');
            element.className = "note";
            element.setAttribute('contenteditable', true);
            element.textContent = note.content;
            element.addEventListener('blur', function () {
                note.content = this.textContent;
                if (note.content == "") {
                    if (note._id) {
                        deleteNote(selectedUserId, note, function () {
                            document.getElementById('notes').removeChild(element);
                        });
                    } else {
                        document.getElementById('notes').removeChild(element);
                    }
                } else if (!note._id) {
                    postNewNote(selectedUserId, {
                        content: this.textContent
                    }, function (newNote) {
                        note._id = newNote._id;
                    });
                } else {
                    putNote(selectedUserId, note, function () {

                    });

                }
            });
            element.addEventListener('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    if (element.nextSibling.className == "add-note") {
                        element.nextSibling.click();
                    } else {
                        element.nextSibling.focus();
                    }
                }
            });
            return element;
        });

        return notes;
    }
    //
    function createAddNoteButton() {
        var element = document.createElement('li');
        element.className = "add-note";
        element.textContent = "Add a new note ...";
        element.addEventListener('click', function () {
            var noteElement = createNoteElements([{}])[0];
            document.getElementById('notes').insertBefore(noteElement, this);
            noteElement.focus();
        });
        return element;
    }

    document.addEventListener('DOMContentLoaded', startup, false);

})();