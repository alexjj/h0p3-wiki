/*\
title: $:/plugins/matabele/widgets/action-maketid.js
type: application/javascript
module-type: widget

Action widget to create new tiddlers
\*/
(function() {
	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	var Widget = require("$:/core/modules/widgets/widget.js").widget;
	var MakeTidWidget = function(parseTreeNode, options) {
		this.initialise(parseTreeNode, options);
	};

	/*
	Inherit from the base widget class
	*/
	MakeTidWidget.prototype = new Widget();

	/*
	Render this widget into the DOM
	*/
	MakeTidWidget.prototype.render = function(parent, nextSibling) {
		this.parentDomNode = parent;
		this.computeAttributes();
		this.execute();
		this.renderChildren(parent, nextSibling);
	};

	/*
	Compute the internal state of the widget
	*/
	MakeTidWidget.prototype.execute = function() {
		this.tidTitle = this.getAttribute("$title", this.getVariable(
			"currentTiddler"));
		this.tidTemplate = (this.getAttribute("$template"))
		 	? this.getAttribute("$template")
			: this.getAttribute("$skeleton", "");
		this.tidNavigate = this.getAttribute("$navigate", "show");
		this.filtertags = this.getAttribute("$tags");
		this.makeChildWidgets();
	};

	/*
	Selectively refreshes the widget if needed.
	*/
	MakeTidWidget.prototype.refresh = function(changedTiddlers) {
		var changedAttributes = this.computeAttributes();
		if(changedAttributes.$navigate || changedAttributes.$template ||
			changedAttributes.$title || changedAttributes.$tags) {
			this.refreshSelf();
			return true;
		}
		return this.refreshChildren(changedTiddlers);
	};

	/*
	Invoke the action associated with this widget
	*/
	MakeTidWidget.prototype.invokeAction = function(triggeringWidget, event) {
		var tiddler;
		// Fetch creation fields
		var modifications = this.wiki.getCreationFields();
		// Check if the title is unique, else make a new one
		var title = this.wiki.generateNewTitle(this.tidTitle || $tw.language
			.getString(
				"DefaultNewTiddlerTitle"));
		modifications.title = title;
		// Merge any fields specified
		$tw.utils.each(this.attributes, function(attribute, name) {
			if(name.charAt(0) !== "$" && name !== "title") {
				modifications[name] = attribute;
			}
		});
		// Make a clone of the template if specified
		if(this.tidTemplate && this.wiki.getTiddler(this.tidTemplate) !== undefined) {
			var mod;
			tiddler = this.wiki.getTiddler(this.tidTemplate);
			// Remove any modification fields from the template (this is a new tiddler)
			for(mod in this.wiki.getModificationFields()) {
				delete tiddler[mod];
			}
		} else {
			tiddler = {};
		}
		// Save the clone
		this.wiki.addTiddler(new $tw.Tiddler(tiddler, modifications));
		//Set the tags in the case that the $tags= attribute is specified
		if(this.filtertags) {
			var tagfilter = "[list[" + title + "!!tags]] " + this.filtertags;
			this.wiki.setText(title, "tags", undefined, $tw.utils.stringifyList(this.wiki
				.filterTiddlers(tagfilter, this)));
		}
		// Control navigation to the new tiddler
		switch(this.tidNavigate) {
			case "edit":
				this.dispatchEvent({
					type: "tm-edit-tiddler",
					param: title
				});
				break;
			case "show":
				var bounds = this.parentDomNode.getBoundingClientRect();
				this.dispatchEvent({
					type: "tm-navigate",
					navigateTo: title,
					navigateFromTitle: this.getVariable("storyTiddler"),
					navigateFromNode: this,
					navigateFromClientRect: {
						top: bounds.top,
						left: bounds.left,
						width: bounds.width,
						right: bounds.right,
						bottom: bounds.bottom,
						height: bounds.height
					},
					navigateSuppressNavigation: event.metaKey || event.ctrlKey ||
						(event.button === 1)
				});
				break;
			case "hide":
				break;
		}
		return true; // Action was invoked
	};

	exports["action-maketid"] = MakeTidWidget;

})();