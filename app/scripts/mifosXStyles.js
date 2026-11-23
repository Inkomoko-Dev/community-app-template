define(['underscore'], function () {
    var styles = {
        css: [
            'fontawesome',
            'styles',
            'creditdecision'
        ]
    };

    require(_.reduce(_.keys(styles), function (list, pluginName) {
        return list.concat(_.map(styles[pluginName], function (stylename) {
            return pluginName + '!styles/' + stylename;
        }));
    }, []));
});
