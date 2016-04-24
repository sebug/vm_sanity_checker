/*global define*/
define(['models/M','knockout'], function (M, ko){
    'use strict';

    function BadViewModel() {
	var self = this;

	self.M = ko.observable(new M());
    }

    return BadViewModel;
});
