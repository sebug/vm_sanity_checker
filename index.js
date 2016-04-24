/*global require, process */
(function () {
    'use strict';

    var walk = require('walk');

    var args = process.argv.slice(2);

    if (args.length === 0) {
	console.log('Usage: node index.js directory');
	return 1;
    }

    var directory = args[0];
    var walker = walk.walk(directory);

    walker.on('file', function (root, fileStats, next) {
	if (fileStats.name && fileStats.name.indexOf('.js') === fileStats.name.length - 3) {
	    console.log(fileStats.name);
	}
	next();
    });
}());
