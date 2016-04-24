/*global require, process */
(function () {
    'use strict';

    var walk = require('walk');
    var fs = require('fs');
    var args = process.argv.slice(2);
    var acorn = require('acorn');

    if (args.length === 0) {
	console.log('Usage: node index.js directory');
	return 1;
    }

    var directory = args[0];
    var walker = walk.walk(directory);

    var evaluation_results = [];

    walker.on('file', function (root, fileStats, next) {
	if (fileStats.name && fileStats.name.indexOf('.js') === fileStats.name.length - 3) {
	    fs.readFile(root + '/' + fileStats.name, 'utf8', function (err, data) {
		if (err) {
		    throw err;
		}
		var tree = acorn.parse(data);
		var res = sym_exec(tree, {});
		if (res.__done) {
		    evaluation_results.push({
			fileName: root + '/' + fileStats.name,
			result: view_model_okay(res.value.value)
		    });
		} else {
		    throw new Error("Error executing the tree");
		}
		next();
	    });
	} else {
	    next();
	}
    });

    walker.on('end', function () {
	console.log(evaluation_results);
    });

    function view_model_okay(fd) {
	return {
	    okay: fd.params.length >= 3
	};
    }

    function sym_exec(t, scope) {
	switch (t.type) {
	case 'Program':
	    return program(t, scope);
	case 'ExpressionStatement':
	    return expression_statement(t, scope);
	case 'BlockStatement':
	    return block_statement(t, scope);
	case 'ReturnStatement':
	    return return_statement(t, scope);
	case 'VariableDeclaration':
	    return variable_declaration(t, scope);
	}
	console.log('unknown node:');
	console.log(t);
    }

    function program(p, scope) {
	return p.body.reduce(function (acc, item) {
	    return sym_exec(item, acc.scope);
	}, {
	    scope: scope
	});
    }

    function expression_statement(es, scope) {
	var expression_result = expression(es.expression);
	if (typeof expression_result === 'object') {
	    return extend_scope(scope, expression_result);
	}
	return scope;
    }

    function expression(e, scope) {
	switch (e.type) {
	case 'CallExpression':
	    return call_expression(e, scope);
	case 'Literal':
	    return literal(e, scope);
	}
	console.log('Unknown expression type: ' + e.type);
    }

    function call_expression(e, scope) {
	if (e.callee.type === 'Identifier' && e.callee.name === 'define') {
	    return define_expression(e, scope);
	} else {
	    console.log(e);
	}
    }

    function literal(e, scope) {
	return; // nothing to be done
    }

    function variable_declaration(vd, scope) {
	return vd.declarations.reduce(function (acc, current) {
	    var newScope;
	    if (current.type === 'VariableDeclarator') {
		newScope = {};
		newScope[current.id.name] = {
		    type: 'VariableDeclaration',
		    value: expression(current.init)
		};
		return extend_scope(acc, newScope);
	    }
	    return acc;
	}, scope);
    }

    function define_expression(e, scope) {
	if (!e.arguments || e.arguments.length !== 2) {
	    throw new Error('don\'t know how to handle define expressions of length != 2');
	}
	var requireNames = e.arguments[0];
	var fe = e.arguments[1];
	if (requireNames.type !== 'ArrayExpression') {
	    throw new Error('Expected first argument to be an array');
	}
	if (fe.type !== 'FunctionExpression') {
	    throw new Error('Expected second argument to be a function taking the required elements');
	}
	if (fe.params.length > requireNames.elements.length) {
	    throw new Error('Some function arguments will be undefined');
	}
	var scopeAdditions = {};
	fe.params.forEach(function (p, i) {
	    if (p.type !== 'Identifier') {
		throw new Error('Expected parameter to be of type identifier');
	    }
	    var associatedRequire = requireNames.elements[i];
	    if (!associatedRequire || associatedRequire.type !== 'Literal') {
		throw new Error('Expected associated require to be a literal');
	    }
	    scopeAdditions[p.name] = {
		type: 'RequireDefinition',
		value: associatedRequire.value
	    };
	});
	var newScope = extend_scope(scope, scopeAdditions);
	return sym_exec(fe.body, newScope);
    }

    function extend_scope(oldScope, additions) {
	var result = {};
	var k;
	for (k in oldScope) {
	    if (oldScope.hasOwnProperty(k)) {
		result[k] = oldScope[k];
	    }
	}

	for (k in additions) {
	    if (additions.hasOwnProperty(k)) {
		result[k] = additions[k];
	    }
	}

	return result;
    }

    function block_statement(bs, scope) {
	// First, hoist function definitions
	var scope1 = function_declarations(bs.body, scope);
	var bs1 = bs.body.filter(function (itm) {
	    return itm.type !== 'FunctionDeclaration';
	});
	return bs1.reduce(function (acc, current) {
	    if (acc.__done) {
		return acc;
	    }
	    var current_result = sym_exec(current, acc);
	    if (current_result.__done) {
		return current_result;
	    }
	    if (typeof current_result === 'object') {
		return extend_scope(acc, current_result);
	    }
	    return acc;
	}, scope1);
    }

    function function_declarations(arr, scope) {
	var result = arr.reduce(function (acc, current) {
	    if (current.type !== 'FunctionDeclaration') {
		return acc;
	    } else {
		var declarationResult = function_declaration(current, scope);
		var newScope = {};
		newScope[declarationResult.name] = {
			type: declarationResult.type,
			value: declarationResult.value
		};
		return extend_scope(acc, newScope);
	    }
	}, scope);

	return result;
    }

    function function_declaration(fd, scope) {
	return {
	    type: 'FunctionDeclaration',
	    name: fd.id.name,
	    value: fd
	};
    }

    function return_statement(rs, scope) {
	if (rs.argument.type !== 'Identifier') {
	    throw new Error('Unhandled return argument type: ' + rs.argument.type);
	}
	return {
	    '__done': true,
	    value: scope[rs.argument.name]
	};
    }
    
}());
