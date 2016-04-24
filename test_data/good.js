/*global define*/
define(['model/M', 'knockout'], function (M, ko) {
    'use strict';
    var someVar = 42;

    function GoodViewModel(initialData, getData, context) {
	var self = this;

	self.M = ko.observable(new M(initialData));
    }

    return GoodViewModel;
});
