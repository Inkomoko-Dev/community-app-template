(function (module) {
    mifosX.services = _.extend(module, {
        BulkImportHelper: function () {
        }
    });
    mifosX.ng.services.service('BulkImportHelper', [mifosX.services.BulkImportHelper]).run(
        ['$rootScope', '$http', '$timeout', '$filter', function ($rootScope, $http, $timeout, $filter) {
            var FAILURE_MESSAGE_LIMIT = 20;
            var FAILURE_BANNER_LIMIT = 8;

            function uploadedImportId(response) {
                var body = response;
                if (response && angular.isObject(response) && response.data !== undefined && response.status) {
                    body = response.data;
                }
                if (angular.isString(body)) {
                    body = body.replace(/^\s+|\s+$/g, '');
                    if (/^\d+$/.test(body)) {
                        return parseInt(body, 10);
                    }
                }
                if (angular.isNumber(body)) {
                    return body;
                }
                return null;
            }

            function outputFileName(importDocument) {
                var name = importDocument && importDocument.name ? String(importDocument.name) : "import-output.xls";
                if (!/\.xls$/i.test(name)) {
                    name += ".xls";
                }
                return name;
            }

            function getOutputFile(importDocument) {
                return $http.get($rootScope.hostUrl + importDocument.docUrl, {
                    responseType: "arraybuffer"
                });
            }

            function saveOutputFile(data, fileName) {
                var blob = new Blob([data], {type: "application/vnd.ms-excel"});
                var blobUrl = window.URL.createObjectURL(blob);
                var link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                $timeout(function () {
                    window.URL.revokeObjectURL(blobUrl);
                }, 1000);
            }

            function errorArgs(temp) {
                var args = {params: []};
                if (temp && angular.isArray(temp.args)) {
                    angular.forEach(temp.args, function (arg) {
                        if (arg && arg.value !== undefined) {
                            args.params.push({value: arg.value});
                        } else {
                            args.params.push({value: arg});
                        }
                    });
                }
                return args;
            }

            function fillPlaceholders(message, args) {
                if (!message) {
                    return message;
                }
                var params = args && args.params ? args.params : [];
                return message.replace(/\{(\d+)\}/g, function (_match, index) {
                    var param = params[parseInt(index, 10)];
                    if (!param || param.value === undefined || param.value === null) {
                        return '';
                    }
                    return String(param.value);
                });
            }

            function toErrorObject(temp) {
                var code = temp.userMessageGlobalisationCode;
                var args = errorArgs(temp);
                var errorObj = {
                    field: temp.parameterName,
                    code: code || temp.defaultUserMessage || 'Request failed.',
                    args: args,
                    body: temp
                };
                var translated = '';
                if (code) {
                    translated = $filter('translate')(code, args);
                }
                if (temp.defaultUserMessage && (!code || !translated || translated === code)) {
                    errorObj.userMessage = fillPlaceholders(temp.defaultUserMessage, args);
                }
                return errorObj;
            }

            function showProcessingFailure(scope, message) {
                var errorArray = [];
                angular.forEach(String(message).split('\n'), function (line) {
                    var text = line.replace(/^\s+|\s+$/g, '');
                    if (text) {
                        errorArray.push({userMessage: text, code: text, args: {params: []}});
                    }
                });
                scope.errorStatus = null;
                scope.errorDetails = [errorArray];
            }

            function clearBulkImportErrors(scope) {
                delete scope.errorDetails;
                delete scope.errorStatus;
            }

            $rootScope.failBulkImportUpload = function (scope, rejection) {
                scope.errorDetails = [];
                scope.errorStatus = null;
                var status = rejection ? rejection.status : 0;
                if (!status || status === -1) {
                    scope.errorStatus = 'No connection. Verify application is running.';
                    return;
                }
                if (status === 401) {
                    scope.errorStatus = 'Unauthorized';
                    return;
                }
                if (status === 405) {
                    scope.errorStatus = 'HTTP verb not supported [405]';
                    return;
                }

                var body = rejection ? rejection.data : null;
                if (angular.isString(body)) {
                    var trimmed = body.replace(/^\s+|\s+$/g, '');
                    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
                        try {
                            body = JSON.parse(trimmed);
                        } catch (e) {
                            body = null;
                        }
                    } else if (trimmed && trimmed.charAt(0) !== '<' && trimmed.length < 500) {
                        scope.errorDetails = [[{userMessage: trimmed, code: trimmed, args: {params: []}}]];
                        return;
                    } else {
                        body = null;
                    }
                }

                var errorArray = [];
                if (body && angular.isArray(body.errors) && body.errors.length) {
                    angular.forEach(body.errors, function (temp) {
                        errorArray.push(toErrorObject(temp));
                    });
                } else if (body && (body.userMessageGlobalisationCode || body.defaultUserMessage)) {
                    errorArray.push(toErrorObject(body));
                }

                if (errorArray.length) {
                    scope.errorDetails = [errorArray];
                    return;
                }
                if (status === 500) {
                    scope.errorStatus = 'Internal Server Error [500].';
                    return;
                }
                scope.errorStatus = 'Request failed.';
            };

            function announceFailureReasons(scope, importDocument) {
                var messages = importDocument.failureMessages || [];
                scope.errorStatus = null;
                if (!messages.length) {
                    scope.errorDetails = [[{
                        code: 'label.msg.bulkimport.failurereasonsinfile',
                        args: {count: importDocument.failureCount}
                    }]];
                    return;
                }
                var shown = messages.slice(0, FAILURE_BANNER_LIMIT);
                var errorArray = [];
                angular.forEach(shown, function (failure) {
                    errorArray.push({
                        userMessage: 'Row ' + failure.row + ': ' + failure.text,
                        code: 'label.msg.bulkimport.failurerow',
                        args: {params: []}
                    });
                });
                var total = importDocument.failureMessageTotal || messages.length;
                if (total > shown.length) {
                    errorArray.push({
                        code: 'label.msg.bulkimport.morefailurereasons',
                        args: {shown: shown.length, total: total}
                    });
                }
                scope.errorDetails = [errorArray];
            }

            $rootScope.loadBulkImportFailureReasons = function (scope, importDocument, announce) {
                if (!importDocument || !importDocument.docUrl) {
                    return;
                }
                if (importDocument.failureMessages || importDocument.failureMessagesLoading) {
                    if (announce && importDocument.failureMessages) {
                        announceFailureReasons(scope, importDocument);
                    }
                    return;
                }
                importDocument.failureMessagesLoading = true;
                getOutputFile(importDocument).then(function (response) {
                    var buffer = response.data;
                    var parsed = readXlsStatusFailures(buffer);
                    $timeout(function () {
                        importDocument.failureMessagesLoading = false;
                        importDocument.failureMessagesParsed = true;
                        importDocument.failureMessages = parsed.ok ? parsed.messages : [];
                        importDocument.failureMessageTotal = parsed.ok ? parsed.total : 0;
                        importDocument.failureMessagesTruncated = parsed.ok && parsed.total > parsed.messages.length;
                        if (announce) {
                            announceFailureReasons(scope, importDocument);
                        }
                    });
                }).catch(function (err) {
                    console.error(err);
                    $timeout(function () {
                        importDocument.failureMessagesLoading = false;
                        importDocument.failureMessagesParsed = true;
                        importDocument.failureMessages = [];
                        importDocument.failureMessageTotal = 0;
                        if (announce) {
                            announceFailureReasons(scope, importDocument);
                        }
                    });
                });
            };

            $rootScope.finishBulkImportUpload = function (scope, response) {
                clearBulkImportErrors(scope);
                var importId = uploadedImportId(response);
                var attempts = 0;
                var previousMaxId = 0;
                angular.forEach(scope.imports, function (item) {
                    if (item && Number(item.importId) > previousMaxId) {
                        previousMaxId = Number(item.importId);
                    }
                });
                if (scope.bulkImportPoll) {
                    $timeout.cancel(scope.bulkImportPoll);
                }
                if (!scope.bulkImportPollBound) {
                    scope.bulkImportPollBound = true;
                    scope.$on('$destroy', function () {
                        if (scope.bulkImportPoll) {
                            $timeout.cancel(scope.bulkImportPoll);
                        }
                    });
                }
                function uploadedRow(items) {
                    var match = null;
                    angular.forEach(items, function (item) {
                        if (!item || item.importId == null) {
                            return;
                        }
                        var itemId = Number(item.importId);
                        if (importId != null && itemId === Number(importId)) {
                            match = item;
                        } else if (importId == null && itemId > previousMaxId && (!match || itemId > Number(match.importId))) {
                            match = item;
                        }
                    });
                    return match;
                }
                function poll() {
                    scope.refreshImportTable(function () {
                        var row = uploadedRow(scope.imports);
                        var finished = row && (row.completed === true || row.completed === 'true');
                        var failed = row && !finished && row.failureMessage;
                        if (!finished && !failed && attempts < 90) {
                            attempts++;
                            scope.bulkImportPoll = $timeout(poll, 1000);
                            return;
                        }
                        if (failed) {
                            showProcessingFailure(scope, row.failureMessage);
                        }
                    });
                }
                poll();
            };

            $rootScope.downloadBulkImportOutput = function (importDocument) {
                if (!importDocument || !importDocument.docUrl) {
                    return;
                }
                getOutputFile(importDocument).then(function (response) {
                    saveOutputFile(response.data, outputFileName(importDocument));
                }).catch(function (err) {
                    console.error(err);
                    alert("Failed to download import output. Please check your authentication.");
                });
            };

            function readXlsStatusFailures(arrayBuffer) {
                try {
                    return parseXlsStatusFailures(arrayBuffer);
                } catch (e) {
                    console.error(e);
                    return {ok: false, messages: [], total: 0};
                }
            }

            function parseXlsStatusFailures(arrayBuffer) {
                var buf = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
                if (buf.length < 512 || buf.length > 20000000) {
                    return {ok: false, messages: [], total: 0};
                }
                if (buf[0] !== 0xD0 || buf[1] !== 0xCF || buf[2] !== 0x11 || buf[3] !== 0xE0) {
                    return {ok: false, messages: [], total: 0};
                }
                var view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
                var sectorShift = view.getUint16(0x1E, true);
                var miniShift = view.getUint16(0x20, true);
                var sectorSize = 1 << sectorShift;
                var miniSize = 1 << miniShift;
                var fatCount = view.getUint32(0x2C, true);
                var firstDir = view.getUint32(0x30, true);
                var miniCutoff = view.getUint32(0x38, true);
                var firstMiniFat = view.getUint32(0x3C, true);
                var miniFatCount = view.getUint32(0x40, true);
                var fat = readFat(buf, view, sectorSize, fatCount);
                var dirBytes = readChain(buf, fat, firstDir, sectorSize);
                var workbook = findStream(dirBytes, fat, buf, sectorSize, miniSize, miniCutoff, firstMiniFat, miniFatCount, ["Workbook", "Book"]);
                if (!workbook) {
                    return {ok: false, messages: [], total: 0};
                }
                return statusMessagesFromWorkbook(workbook);
            }

            function readFat(buf, view, sectorSize, fatCount) {
                var ids = [];
                var i;
                for (i = 0; i < 109 && ids.length < fatCount; i++) {
                    var id = view.getUint32(0x4C + (i * 4), true);
                    if (id >= 0xFFFFFFF0) {
                        break;
                    }
                    ids.push(id);
                }
                var difat = view.getUint32(0x44, true);
                var difatCount = view.getUint32(0x48, true);
                var n;
                for (n = 0; n < difatCount && difat < 0xFFFFFFF0 && ids.length < fatCount; n++) {
                    var pos = (difat + 1) * sectorSize;
                    var entries = (sectorSize / 4) - 1;
                    for (i = 0; i < entries && ids.length < fatCount; i++) {
                        var next = new DataView(buf.buffer, buf.byteOffset + pos + (i * 4), 4).getUint32(0, true);
                        if (next < 0xFFFFFFF0) {
                            ids.push(next);
                        }
                    }
                    difat = new DataView(buf.buffer, buf.byteOffset + pos + (entries * 4), 4).getUint32(0, true);
                }
                var fat = [];
                for (i = 0; i < ids.length; i++) {
                    var start = (ids[i] + 1) * sectorSize;
                    var count = sectorSize / 4;
                    var fatView = new DataView(buf.buffer, buf.byteOffset + start, sectorSize);
                    for (n = 0; n < count; n++) {
                        fat.push(fatView.getUint32(n * 4, true));
                    }
                }
                return fat;
            }

            function readChain(buf, fat, start, sectorSize) {
                var parts = [];
                var sector = start;
                var guard = 0;
                var seen = {};
                while (sector < 0xFFFFFFF0 && guard < 100000) {
                    if (seen[sector]) {
                        break;
                    }
                    seen[sector] = true;
                    var pos = (sector + 1) * sectorSize;
                    parts.push(buf.subarray(pos, pos + sectorSize));
                    sector = fat[sector];
                    guard++;
                }
                return concatBytes(parts);
            }

            function concatBytes(parts) {
                var size = 0;
                var i;
                for (i = 0; i < parts.length; i++) {
                    size += parts[i].length;
                }
                var out = new Uint8Array(size);
                var offset = 0;
                for (i = 0; i < parts.length; i++) {
                    out.set(parts[i], offset);
                    offset += parts[i].length;
                }
                return out;
            }

            function findStream(dirBytes, fat, buf, sectorSize, miniSize, miniCutoff, firstMiniFat, miniFatCount, names) {
                var entrySize = 128;
                var entries = Math.floor(dirBytes.length / entrySize);
                var rootStart = 0;
                var rootSize = 0;
                var match = null;
                var i;
                for (i = 0; i < entries; i++) {
                    var entry = dirBytes.subarray(i * entrySize, (i + 1) * entrySize);
                    var name = dirName(entry);
                    var type = entry[0x42];
                    var start = new DataView(entry.buffer, entry.byteOffset + 0x74, 4).getUint32(0, true);
                    var size = new DataView(entry.buffer, entry.byteOffset + 0x78, 4).getUint32(0, true);
                    if (type === 5) {
                        rootStart = start;
                        rootSize = size;
                    }
                    if (type === 2 && names.indexOf(name) !== -1) {
                        match = {start: start, size: size};
                    }
                }
                if (!match) {
                    return null;
                }
                if (match.size < miniCutoff && match.size > 0) {
                    var miniFat = readMiniFat(buf, fat, sectorSize, firstMiniFat, miniFatCount);
                    var miniStream = readChain(buf, fat, rootStart, sectorSize).subarray(0, rootSize);
                    return readMiniChain(miniStream, miniFat, match.start, miniSize).subarray(0, match.size);
                }
                return readChain(buf, fat, match.start, sectorSize).subarray(0, match.size);
            }

            function dirName(entry) {
                var len = entry[0x40] | (entry[0x41] << 8);
                if (len >= 2) {
                    len -= 2;
                }
                var chars = '';
                var i;
                for (i = 0; i < len; i += 2) {
                    chars += String.fromCharCode(entry[i] | (entry[i + 1] << 8));
                }
                return chars;
            }

            function readMiniFat(buf, fat, sectorSize, start, count) {
                var miniFat = [];
                var sector = start;
                var seen = 0;
                while (sector < 0xFFFFFFF0 && seen < count) {
                    var pos = (sector + 1) * sectorSize;
                    var view = new DataView(buf.buffer, buf.byteOffset + pos, sectorSize);
                    var n;
                    for (n = 0; n < sectorSize / 4; n++) {
                        miniFat.push(view.getUint32(n * 4, true));
                    }
                    sector = fat[sector];
                    seen++;
                }
                return miniFat;
            }

            function readMiniChain(miniStream, miniFat, start, miniSize) {
                var parts = [];
                var sector = start;
                var guard = 0;
                var seen = {};
                while (sector < 0xFFFFFFF0 && guard < 100000) {
                    if (seen[sector]) {
                        break;
                    }
                    seen[sector] = true;
                    var pos = sector * miniSize;
                    parts.push(miniStream.subarray(pos, pos + miniSize));
                    sector = miniFat[sector];
                    guard++;
                }
                return concatBytes(parts);
            }

            function statusMessagesFromWorkbook(workbook) {
                var records = biffRecords(workbook);
                var strings = [];
                var cells = [];
                var inSheet = false;
                var i;
                for (i = 0; i < records.length; i++) {
                    var record = records[i];
                    if (record.type === 0x00FC) {
                        var parts = [record.data];
                        while (i + 1 < records.length && records[i + 1].type === 0x003C) {
                            i++;
                            parts.push(records[i].data);
                        }
                        strings = parseSst(parts);
                    } else if (record.type === 0x0809) {
                        var dt = record.data.length >= 4 ? (record.data[2] | (record.data[3] << 8)) : 0;
                        if (dt === 0x0010) {
                            if (inSheet) {
                                break;
                            }
                            inSheet = true;
                        }
                    } else if (record.type === 0x000A && inSheet) {
                        break;
                    } else if (inSheet && record.type === 0x00FD && record.data.length >= 10) {
                        var row = record.data[0] | (record.data[1] << 8);
                        var col = record.data[2] | (record.data[3] << 8);
                        var isst = (record.data[6] | (record.data[7] << 8) | (record.data[8] << 16) | (record.data[9] << 24)) >>> 0;
                        cells.push({row: row, col: col, text: strings[isst] || ''});
                    } else if (inSheet && record.type === 0x0204 && record.data.length >= 8) {
                        cells.push({
                            row: record.data[0] | (record.data[1] << 8),
                            col: record.data[2] | (record.data[3] << 8),
                            text: readPlainString(record.data, 6)
                        });
                    }
                }
                var statusCol = null;
                for (i = 0; i < cells.length; i++) {
                    if (cells[i].row === 0 && String(cells[i].text).replace(/^\s+|\s+$/g, '') === 'Status') {
                        statusCol = cells[i].col;
                    }
                }
                if (statusCol === null) {
                    return {ok: false, messages: [], total: 0};
                }
                var messages = [];
                for (i = 0; i < cells.length; i++) {
                    if (cells[i].col !== statusCol || cells[i].row === 0) {
                        continue;
                    }
                    var text = String(cells[i].text).replace(/^\s+|\s+$/g, '');
                    if (!text || text === 'Imported' || text === 'Status') {
                        continue;
                    }
                    messages.push({row: cells[i].row + 1, text: text});
                }
                messages.sort(function (a, b) {
                    return a.row - b.row;
                });
                return {ok: true, messages: messages.slice(0, FAILURE_MESSAGE_LIMIT), total: messages.length};
            }

            function biffRecords(workbook) {
                var records = [];
                var offset = 0;
                while (offset + 4 <= workbook.length) {
                    var type = workbook[offset] | (workbook[offset + 1] << 8);
                    var len = workbook[offset + 2] | (workbook[offset + 3] << 8);
                    offset += 4;
                    if (offset + len > workbook.length) {
                        break;
                    }
                    records.push({type: type, data: workbook.subarray(offset, offset + len)});
                    offset += len;
                }
                return records;
            }

            function parseSst(parts) {
                var cursor = {parts: parts, pi: 0, o: 0};
                readU32(cursor);
                var uniqueCount = readU32(cursor);
                var strings = [];
                var i;
                for (i = 0; i < uniqueCount; i++) {
                    strings.push(readRichString(cursor));
                }
                return strings;
            }

            function remain(cursor) {
                return cursor.parts[cursor.pi].length - cursor.o;
            }

            function nextPart(cursor) {
                cursor.pi++;
                cursor.o = 0;
            }

            function readBytes(cursor, n) {
                var out = new Uint8Array(n);
                var filled = 0;
                while (filled < n) {
                    if (remain(cursor) === 0) {
                        nextPart(cursor);
                    }
                    var take = Math.min(n - filled, remain(cursor));
                    out.set(cursor.parts[cursor.pi].subarray(cursor.o, cursor.o + take), filled);
                    cursor.o += take;
                    filled += take;
                }
                return out;
            }

            function readU16(cursor) {
                var b = readBytes(cursor, 2);
                return b[0] | (b[1] << 8);
            }

            function readU32(cursor) {
                var b = readBytes(cursor, 4);
                return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
            }

            function readRichString(cursor) {
                var cch = readU16(cursor);
                var flagsByte = readBytes(cursor, 1);
                var flags = flagsByte[0];
                var rich = (flags & 0x8) !== 0;
                var ext = (flags & 0x4) !== 0;
                var wide = (flags & 0x1) !== 0;
                var cRun = rich ? readU16(cursor) : 0;
                var cbExt = ext ? readU32(cursor) : 0;
                var text = readChars(cursor, cch, wide);
                skipBytes(cursor, cRun * 4);
                skipBytes(cursor, cbExt);
                return text;
            }

            function readChars(cursor, cch, wide) {
                var out = '';
                var left = cch;
                while (left > 0) {
                    if (remain(cursor) === 0) {
                        nextPart(cursor);
                        wide = (readBytes(cursor, 1)[0] & 1) !== 0;
                    }
                    var bytesPerChar = wide ? 2 : 1;
                    var can = Math.floor(remain(cursor) / bytesPerChar);
                    if (can === 0) {
                        nextPart(cursor);
                        wide = (readBytes(cursor, 1)[0] & 1) !== 0;
                        continue;
                    }
                    var n = Math.min(left, can);
                    var part = cursor.parts[cursor.pi];
                    var i;
                    if (!wide) {
                        for (i = 0; i < n; i++) {
                            out += String.fromCharCode(part[cursor.o++]);
                        }
                    } else {
                        for (i = 0; i < n; i++) {
                            out += String.fromCharCode(part[cursor.o] | (part[cursor.o + 1] << 8));
                            cursor.o += 2;
                        }
                    }
                    left -= n;
                }
                return out;
            }

            function skipBytes(cursor, n) {
                var left = n;
                while (left > 0) {
                    if (remain(cursor) === 0) {
                        nextPart(cursor);
                    }
                    var take = Math.min(left, remain(cursor));
                    cursor.o += take;
                    left -= take;
                }
            }

            function readPlainString(data, offset) {
                if (offset + 3 > data.length) {
                    return '';
                }
                var cch = data[offset] | (data[offset + 1] << 8);
                var wide = (data[offset + 2] & 1) !== 0;
                var pos = offset + 3;
                var out = '';
                var i;
                if (!wide) {
                    for (i = 0; i < cch && pos < data.length; i++) {
                        out += String.fromCharCode(data[pos++]);
                    }
                } else {
                    for (i = 0; i < cch && pos + 1 < data.length; i++) {
                        out += String.fromCharCode(data[pos] | (data[pos + 1] << 8));
                        pos += 2;
                    }
                }
                return out;
            }
        }]);
}(mifosX.services || {}));
