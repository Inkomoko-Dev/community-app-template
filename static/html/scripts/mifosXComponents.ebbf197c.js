define(['Q', 'underscore', 'mifosX'], function (Q) {
    var components = {
        models: [
            'models.e7387d4c'
        ],
        services: [
            'ResourceFactoryProvider',
            'HttpServiceProvider',
            'AuthenticationService',
            'SessionManager',
            'Paginator',
            'UIConfigService',
            'NotificationResponseHeaderProvider'
        ],
        controllers: [
            'controllers.2799cfab'
        ],
        filters: [
            'filters.4c126b6b'
        ],
        directives: [
            'directives.cb9963af'
        ]
    };

    return function() {
        var defer = Q.defer();
        require(_.reduce(_.keys(components), function (list, group) {
            return list.concat(_.map(components[group], function (name) {
                return group + "/" + name;
            }));
        }, [
            'routes-initialTasks-webstorage-configuration.a3e0fdbb'
        ]), function(){
            defer.resolve();
        });
        return defer.promise;
    }
});
