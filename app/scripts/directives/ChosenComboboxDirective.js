(function (module) {
    mifosX.directives = _.extend(module, {
        ChosenComboboxDirective: function ($compile) {
            var linker = function (scope, element, attrs) {
                var refresh = function () {
                    element.trigger('liszt:updated');
                    element.trigger("chosen:updated");
                };
                scope.$watch(attrs['chosen'], refresh);
                if (attrs['ngModel']) {
                    scope.$watch(attrs['ngModel'], refresh);
                }

                element.chosen({search_contains:true});
            };

            return {
                restrict: 'A',
                link: linker
            }
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("chosen", ['$compile', mifosX.directives.ChosenComboboxDirective]).run(function ($log) {
    $log.info("ChosenComboboxDirective initialized");
});