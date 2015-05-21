#!/bin/env node
var express = require('express');
var fs      = require('fs');

var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;

var name = 'guest';

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://nodejs-mver.rhcloud.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      console.log("Done: profile=", profile);
      name = profile.displayName;
      done(null, profile);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var SampleApp = function() {

    var self = this;

    self.setupVariables = function() {
	console.log("ID=" + process.env.FACEBOOK_APP_ID);
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    self.cache_get = function(key) { return self.zcache[key]; };


    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    self.setupTerminationHandlers = function(){
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    self.createRoutes = function() {
        self.routes = { };

	self.routes['/auth/facebook'] = passport.authenticate('facebook');

	self.routes['/auth/facebook/callback'] = passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' });

        self.routes['/auth/logout'] = function(req, res) { 
            name = 'guest';
            res.redirect('/');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            //res.send(self.cache_get('index.html').replace('guest', name) );
            html = '<html><body> Welcome, ' + name + '<p>' + (name==='guest' ? '<a href="/auth/facebook">Login with Facebook</a>' : '<a href="/auth/logout">Logout</a>') + '</body></html>'
            res.send(html);
        };
    };


    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

	self.app.use(passport.initialize());
        self.app.use(passport.session());

        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        self.initializeServer();
    };


    self.start = function() {
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};


var zapp = new SampleApp();
zapp.initialize();
zapp.start();

