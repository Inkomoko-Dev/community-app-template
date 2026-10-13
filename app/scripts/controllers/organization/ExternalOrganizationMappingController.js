(function (module) {
    mifosX.controllers = _.extend(module, {
        ExternalOrganizationMappingController: function (scope, resourceFactory, location, $uibModal, route) {
            scope.mappings = [];
            scope.offices = [];
            scope.filterText = '';
            scope.importResult = null;
            scope.importing = false;

            resourceFactory.officeResource.getAllOfficesInAlphabeticalOrder(function (offices) {
                scope.offices = offices || [];
            });
            resourceFactory.externalOrganizationMappingResource.getAll(function (data) {
                scope.mappings = data || [];
            });

            scope.showEdit = function (id) {
                location.path('/editexternalorganizationmapping/' + id);
            };

            var MappingDeleteCtrl = function ($scope, $uibModalInstance, mappingId) {
                $scope.delete = function () {
                    resourceFactory.externalOrganizationMappingResource.delete({mappingId: mappingId}, {}, function () {
                        $uibModalInstance.close('delete');
                        route.reload();
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.deleteMapping = function (id) {
                $uibModal.open({
                    templateUrl: 'deleteExternalOrganizationMapping.html',
                    controller: MappingDeleteCtrl,
                    resolve: {
                        mappingId: function () {
                            return id;
                        }
                    }
                });
            };

            scope.exportCsv = function () {
                var byOffice = {};
                angular.forEach(scope.mappings, function (mapping) {
                    byOffice[String(mapping.officeId)] = mapping;
                });
                var rows = [['officeId', 'officeName', 'externalSystem', 'externalId', 'externalName', 'currencyCode', 'active']];
                var offices = scope.offices.length ? scope.offices : [];
                if (offices.length) {
                    angular.forEach(offices, function (office) {
                        var mapping = byOffice[String(office.id)];
                        rows.push([
                            office.id,
                            office.name || '',
                            mapping ? mapping.externalSystem : 'GL',
                            mapping ? mapping.externalId : '',
                            mapping ? mapping.externalName : '',
                            mapping ? (mapping.currencyCode || '') : '',
                            mapping ? mapping.active : true
                        ]);
                    });
                } else {
                    angular.forEach(scope.mappings, function (mapping) {
                        rows.push([
                            mapping.officeId,
                            mapping.officeName || '',
                            mapping.externalSystem,
                            mapping.externalId,
                            mapping.externalName,
                            mapping.currencyCode || '',
                            mapping.active
                        ]);
                    });
                }
                downloadCsv('external-organization-mappings.csv', rows);
            };

            scope.triggerImport = function () {
                var input = document.getElementById('mappingCsvFile');
                if (input) {
                    input.value = '';
                    input.click();
                }
            };

            scope.onCsvSelected = function (files) {
                var file = files && files[0];
                if (!file) {
                    return;
                }
                var reader = new FileReader();
                reader.onload = function (event) {
                    var rows = parseCsv(event.target.result);
                    if (!rows.length) {
                        scope.$apply(function () {
                            scope.importResult = {created: 0, updated: 0, skipped: 0, errors: ['The CSV file is empty.']};
                        });
                        return;
                    }
                    var mappings = rowsToMappings(rows);
                    scope.$apply(function () {
                        scope.importing = true;
                        scope.importResult = null;
                    });
                    resourceFactory.externalOrganizationMappingImportResource.post({}, {mappings: mappings}, function (result) {
                        scope.importing = false;
                        scope.importResult = result;
                        resourceFactory.externalOrganizationMappingResource.getAll(function (data) {
                            scope.mappings = data || [];
                        });
                    }, function () {
                        scope.importing = false;
                    });
                };
                reader.readAsText(file);
            };

            function rowsToMappings(rows) {
                var header = rows[0].map(function (cell) {
                    return String(cell || '').trim();
                });
                var index = {};
                angular.forEach(header, function (name, i) {
                    index[name] = i;
                });
                var mappings = [];
                for (var i = 1; i < rows.length; i++) {
                    var row = rows[i];
                    mappings.push({
                        officeId: toNumber(cell(row, index, 'officeId')),
                        officeName: cell(row, index, 'officeName'),
                        externalSystem: cell(row, index, 'externalSystem') || 'GL',
                        externalId: cell(row, index, 'externalId'),
                        externalName: cell(row, index, 'externalName'),
                        currencyCode: cell(row, index, 'currencyCode'),
                        active: toBoolean(cell(row, index, 'active'))
                    });
                }
                return mappings;
            }

            function cell(row, index, name) {
                var value = row[index[name]];
                return value == null ? '' : String(value).trim();
            }

            function toNumber(value) {
                if (!value) {
                    return undefined;
                }
                var parsed = Number(value);
                return isNaN(parsed) ? undefined : parsed;
            }

            function toBoolean(value) {
                if (value === '' || value == null) {
                    return true;
                }
                return String(value).toLowerCase() !== 'false' && value !== '0';
            }

            function downloadCsv(filename, rows) {
                var csv = rows.map(function (row) {
                    return row.map(csvEscape).join(',');
                }).join('\n');
                var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
                URL.revokeObjectURL(link.href);
            }

            function csvEscape(value) {
                if (value == null) {
                    return '';
                }
                var text = String(value);
                if (/[",\n]/.test(text)) {
                    return '"' + text.replace(/"/g, '""') + '"';
                }
                return text;
            }

            function parseCsv(text) {
                var rows = [];
                var row = [];
                var cellValue = '';
                var inQuotes = false;
                var source = String(text || '').replace(/^\uFEFF/, '');
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (inQuotes) {
                        if (ch === '"') {
                            if (source.charAt(i + 1) === '"') {
                                cellValue += '"';
                                i++;
                            } else {
                                inQuotes = false;
                            }
                        } else {
                            cellValue += ch;
                        }
                    } else if (ch === '"') {
                        inQuotes = true;
                    } else if (ch === ',') {
                        row.push(cellValue);
                        cellValue = '';
                    } else if (ch === '\n') {
                        row.push(cellValue);
                        rows.push(row);
                        row = [];
                        cellValue = '';
                    } else if (ch !== '\r') {
                        cellValue += ch;
                    }
                }
                if (cellValue !== '' || row.length) {
                    row.push(cellValue);
                    rows.push(row);
                }
                return rows.filter(function (item) {
                    return item.some(function (value) {
                        return String(value || '').trim() !== '';
                    });
                });
            }
        }
    });
    mifosX.ng.application.controller('ExternalOrganizationMappingController', ['$scope', 'ResourceFactory', '$location', '$uibModal', '$route', mifosX.controllers.ExternalOrganizationMappingController]).run(function ($log) {
        $log.info("ExternalOrganizationMappingController initialized");
    });
}(mifosX.controllers || {}));
