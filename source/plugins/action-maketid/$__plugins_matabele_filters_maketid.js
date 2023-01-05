/*\
title: $:/plugins/matabele/filters/maketid.js
type: application/javascript
module-type: filteroperator

Generates a list of tiddler titles
\*/
(function() {
	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	//Fetch the titles from the current list
	var prepare_results = function(source) {
		var results = [];
		source(function(tiddler, title) {
			results.push(title);
		});
		return results;
	};

	/*
	Generate a list of unique titles
	*/
	exports.maketid = function(source, operator, options) {
		var date, ex, input, match,
			widget = options.widget,
			wiki = options.wiki,
			results = [];
		// Make defaults
		var m = {
			inc: 1,
			min: 1,
			sep: " ",
			tiddler: widget ? widget.getVariable("currentTiddler") : ""
		};
		// The regular expressions for replacing placeholders
		var reTITLE = /\%TITLE\%/mgi,
			reCOUNT = /\%COUNT\%/mgi,
			reDATE = /\%DATE\%/mgi,
			reMAX = /\%MAX\%/mgi,
			reTIDDLER = /\%TIDDLER\%/mgi,
			// The regex for make options
			reVAR = /^\s*([\$\w\d\-\_\/]*):(.*)(?:\s*)$/;
		//Replaces {{text!!references}} in the make expression
		var replaceRefs = function(match, ref) {
			return wiki.getTextReference(ref, "", m.tiddler);
		};
		//Replaces <<variables>> in the make expression
		var replaceVars = function(match, v) {
			return widget ? widget.getVariable(v) : "";
		};
		// triggers replacing of both variables and text references in an expression
		var replaceRV = function(e) {
			return e
				.replace(/{{([^}]*)}}/mg, replaceRefs)
				.replace(/<<([^>]*)>>/mg, replaceVars);
		};
		// Iterate until a unique title is found
		var unique = function(list, title) {
			var c = 0,
				result = title;
			while(options.wiki.tiddlerExists(result) || options.wiki.isShadowTiddler(
					result) || options.wiki.findDraft(result) || list.indexOf(result) >= 0) {
				result = (title + m.sep + (++c));
			}
			return result;
		};

		var titles = prepare_results(source);
		var len = titles.length;
		// Return errors
		try {
			$tw.utils.each(
				// Operand item, split via "\"
				(operator.operand || "").split("\\"),
				function(arg) {
					var v;
					// Skip empty
					arg = arg.trim();
					if(arg) {
						// Test for make option
						match = reVAR.exec(arg);
						// Is option?
						if(match) {
							// Check options
							switch(match[1]) {
								case "min":
								case "max":
								case "inc":
									// Get any of these as integer while replacing any variables or text-references
									v = parseInt(replaceRV(match[2]));
									// Not an integer or smaller than 0?
									if(isNaN(v) || v < 1) {
										v = 1;
									}
									// Set option to value
									m[match[1]] = v;
									break;
								case "sep":
									m.sep = match[2];
									break;
								case "pad":
									m.pad = parseInt(match[2]);
									break;
								case "tiddler":
									m.tiddler = match[2];
									break;
								case "date-format":
									m.dateFormat = match[2].trim();
									break;
							}
							// Otherwise, if not an option, only once
						} else if(m.expr === undefined) {
							m.expr = arg;
						}
					}
				}
			);
			// No expression?
			if(m.expr === undefined) {
				m.expr = "%tiddler%";
			}
			// Padding defined but NaN
			if(m.pad !== undefined && isNaN(m.pad)) {
				m.pad = m.max ? m.max.toString().length : 2;
			}
			// Has input titles?
			input = !(len === 1 && !titles[0]);
			// Operating on input titles?
			if(input) {
				m.max = m.max ? Math.min(len, m.max) : len;
			}
			// Max undefined or smaller than min
			if(!m.max || m.max < m.min) {
				m.max = m.min;
			}
			// Init counter
			m.count = m.min;
			// No date format
			if(reDATE.test(m.expr)) {
				var start = m.dateFormat || "0hh:0mm, DD/MM/YYYY";
				date = $tw.utils.formatDateString(new Date(), start);
			}
			do {
				// Copy expression while replacing any variables or text-references
				ex = replaceRV(m.expr);
				// Replace placeholders
				ex = unique(results, ex
					.replace(reTIDDLER, m.tiddler)
					.replace(reTITLE, input ? titles[m.count - 1] : m.tiddler)
					.replace(reMAX, m.max)
					.replace(reCOUNT, m.pad ? $tw.utils.pad(m.count, m.pad) : m.count)
					.replace(reDATE, date)
				);
				// Add to output
				results.push(ex);
				// Next generated item
				m.count = m.count + m.inc;
			} while (m.count <= m.max);
		} catch(e) {
			return ["Error in make filter:\n" + e];
		}
		return results;
	};

})();