$(document).ready(function() {

    // Place JavaScript code here...

});

Array.prototype.findValue = (obj, query) => {
    for (var key in obj) {
        var value = obj[key];
        if (typeof value === 'object') {
            searchObj(value, query);
        }
        if (value === query) {
            return true;
        }
    }
    return false;
}
