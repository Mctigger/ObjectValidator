module.exports = function(value, options) {
	options = options || {};

	if(!(typeof value === 'string' || value instanceof String)) {
		return false;
	}
    
	if(options.min && !(value.length > options.min)) {
		return false;
	}

    return true;
}