/*\
title: $:/core/modules/widgets/navigator.js
type: application/javascript
module-type: widget

Navigator widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var IMPORT_TITLE = "$:/Import";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var NavigatorWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
	this.addEventListeners([
		{type: "tm-navigate", handler: "handleNavigateEvent"},
		{type: "tm-edit-tiddler", handler: "handleEditTiddlerEvent"},
		{type: "tm-delete-tiddler", handler: "handleDeleteTiddlerEvent"},
		{type: "tm-save-tiddler", handler: "handleSaveTiddlerEvent"},
		{type: "tm-cancel-tiddler", handler: "handleCancelTiddlerEvent"},
		{type: "tm-close-tiddler", handler: "handleCloseTiddlerEvent"},
		{type: "tm-close-all-tiddlers", handler: "handleCloseAllTiddlersEvent"},
		{type: "tm-close-other-tiddlers", handler: "handleCloseOtherTiddlersEvent"},
		{type: "tm-new-tiddler", handler: "handleNewTiddlerEvent"},
		{type: "tm-import-tiddlers", handler: "handleImportTiddlersEvent"},
		{type: "tm-perform-import", handler: "handlePerformImportEvent"},
		{type: "tm-fold-tiddler", handler: "handleFoldTiddlerEvent"},
		{type: "tm-fold-other-tiddlers", handler: "handleFoldOtherTiddlersEvent"},
		{type: "tm-fold-all-tiddlers", handler: "handleFoldAllTiddlersEvent"},
		{type: "tm-unfold-all-tiddlers", handler: "handleUnfoldAllTiddlersEvent"},
		{type: "tm-rename-tiddler", handler: "handleRenameTiddlerEvent"}
	]);
};

/*
Inherit from the base widget class
*/
NavigatorWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
NavigatorWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	this.renderChildren(parent,nextSibling);
};

/*
Compute the internal state of the widget
*/
NavigatorWidget.prototype.execute = function() {
	// Get our parameters
	this.storyTitle = this.getAttribute("story");
	this.historyTitle = this.getAttribute("history");
	// Construct the child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
NavigatorWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.story || changedAttributes.history) {
		this.refreshSelf();
		return true;
	} else {
		return this.refreshChildren(changedTiddlers);		
	}
};

NavigatorWidget.prototype.getStoryList = function() {
	return this.storyTitle ? this.wiki.getTiddlerList(this.storyTitle) : null;
};

NavigatorWidget.prototype.saveStoryList = function(storyList) {
	var storyTiddler = this.wiki.getTiddler(this.storyTitle);
	this.wiki.addTiddler(new $tw.Tiddler(
		{title: this.storyTitle},
		storyTiddler,
		{list: storyList}
	));
};

NavigatorWidget.prototype.removeTitleFromStory = function(storyList,title) {
	var p = storyList.indexOf(title);
	while(p !== -1) {
		storyList.splice(p,1);
		p = storyList.indexOf(title);
	}
};

NavigatorWidget.prototype.replaceFirstTitleInStory = function(storyList,oldTitle,newTitle) {
	var pos = storyList.indexOf(oldTitle);
	if(pos !== -1) {
		storyList[pos] = newTitle;
		do {
			pos = storyList.indexOf(oldTitle,pos + 1);
			if(pos !== -1) {
				storyList.splice(pos,1);
			}
		} while(pos !== -1);
	} else {
		storyList.splice(0,0,newTitle);
	}
};

NavigatorWidget.prototype.addToStory = function(title,fromTitle) {
	var storyList = this.getStoryList();
	// Quit if we cannot get hold of the story list
	if(!storyList) {
		return;
	}
	// See if the tiddler is already there
	var slot = storyList.indexOf(title);
	// Quit if it already exists in the story river
	if(slot >= 0) {
		return;
	}
	// First we try to find the position of the story element we navigated from
	var fromIndex = storyList.indexOf(fromTitle);
	if(fromIndex >= 0) {
		// The tiddler is added from inside the river
		// Determine where to insert the tiddler; Fallback is "below"
		switch(this.getAttribute("openLinkFromInsideRiver","below")) {
			case "top":
				slot = 0;
				break;
			case "bottom":
				slot = storyList.length;
				break;
			case "above":
				slot = fromIndex;
				break;
			case "below": // Intentional fall-through
			default:
				slot = fromIndex + 1;
				break;
		}
	} else {
		// The tiddler is opened from outside the river. Determine where to insert the tiddler; default is "top"
		if(this.getAttribute("openLinkFromOutsideRiver","top") === "bottom") {
			// Insert at bottom
			slot = storyList.length;
		} else {
			// Insert at top
			slot = 0;
		}
	}
	// Add the tiddler
	storyList.splice(slot,0,title);
	// Save the story
	this.saveStoryList(storyList);
};

/*
Add a new record to the top of the history stack
title: a title string or an array of title strings
fromPageRect: page coordinates of the origin of the navigation
*/
NavigatorWidget.prototype.addToHistory = function(title,fromPageRect) {
	this.wiki.addToHistory(title,fromPageRect,this.historyTitle);
};

/*
Handle a tm-navigate event
*/
NavigatorWidget.prototype.handleNavigateEvent = function(event) {
	if(event.navigateTo) {
        if (!this.wiki.tiddlerExists(event.navigateTo) && event.followAliases == "true") {
            var aliases = this.wiki.filterTiddlers("[title["+event.navigateTo+"]listed[aliases]]")
            if (aliases.length === 1) {
                event.navigateTo = aliases[0]
            }
        }
		this.addToStory(event.navigateTo,event.navigateFromTitle);
		if(!event.navigateSuppressNavigation) {
			this.addToHistory(event.navigateTo,event.navigateFromClientRect);
		}
	}
	return false;
};

// Close a specified tiddler
NavigatorWidget.prototype.handleCloseTiddlerEvent = function(event) {
	var title = event.param || event.tiddlerTitle,
		storyList = this.getStoryList();
	// Look for tiddlers with this title to close
	this.removeTitleFromStory(storyList,title);
	this.saveStoryList(storyList);
	return false;
};

// Close all tiddlers
NavigatorWidget.prototype.handleCloseAllTiddlersEvent = function(event) {
	this.saveStoryList([]);
	return false;
};

// Close other tiddlers
NavigatorWidget.prototype.handleCloseOtherTiddlersEvent = function(event) {
	var title = event.param || event.tiddlerTitle;
	this.saveStoryList([title]);
	return false;
};

// Place a tiddler in edit mode
NavigatorWidget.prototype.handleEditTiddlerEvent = function(event) {
	var self = this;
	function isUnmodifiedShadow(title) {
		return self.wiki.isShadowTiddler(title) && !self.wiki.tiddlerExists(title);
	}
	function confirmEditShadow(title) {
		return confirm($tw.language.getString(
			"ConfirmEditShadowTiddler",
			{variables:
				{title: title}
			}
		));
	}
	var title = event.param || event.tiddlerTitle;
	if(isUnmodifiedShadow(title) && !confirmEditShadow(title)) {
		return false;
	}
	// Replace the specified tiddler with a draft in edit mode
	var draftTiddler = this.makeDraftTiddler(title);
	// Update the story and history if required
	if(!event.paramObject || event.paramObject.suppressNavigation !== "yes") {
		var draftTitle = draftTiddler.fields.title,
			storyList = this.getStoryList();
		this.removeTitleFromStory(storyList,draftTitle);
		this.replaceFirstTitleInStory(storyList,title,draftTitle);
		this.addToHistory(draftTitle,event.navigateFromClientRect);
		this.saveStoryList(storyList);
		return false;
	}
};

// Delete a tiddler
NavigatorWidget.prototype.handleDeleteTiddlerEvent = function(event) {
	// Get the tiddler we're deleting
	var title = event.param || event.tiddlerTitle,
		tiddler = this.wiki.getTiddler(title),
		storyList = this.getStoryList(),
		originalTitle = tiddler ? tiddler.fields["draft.of"] : "",
		confirmationTitle;
	if(!tiddler) {
		return false;
	}
	// Check if the tiddler we're deleting is in draft mode
	if(originalTitle) {
		// If so, we'll prompt for confirmation referencing the original tiddler
		confirmationTitle = originalTitle;
	} else {
		// If not a draft, then prompt for confirmation referencing the specified tiddler
		confirmationTitle = title;
	}
	// Seek confirmation
	if((this.wiki.getTiddler(originalTitle) || (tiddler.fields.text || "") !== "") && !confirm($tw.language.getString(
				"ConfirmDeleteTiddler",
				{variables:
					{title: confirmationTitle}
				}
			))) {
		return false;
	}
	// Delete the original tiddler
	if(originalTitle) {
		this.wiki.deleteTiddler(originalTitle);
		this.removeTitleFromStory(storyList,originalTitle);
	}
	// Delete this tiddler
	this.wiki.deleteTiddler(title);
	// Remove the closed tiddler from the story
	this.removeTitleFromStory(storyList,title);
	this.saveStoryList(storyList);
	// Trigger an autosave
	$tw.rootWidget.dispatchEvent({type: "tm-auto-save-wiki"});
	return false;
};

/*
Create/reuse the draft tiddler for a given title
*/
NavigatorWidget.prototype.makeDraftTiddler = function(targetTitle) {
	// See if there is already a draft tiddler for this tiddler
	var draftTitle = this.wiki.findDraft(targetTitle);
	if(draftTitle) {
		return this.wiki.getTiddler(draftTitle);
	}
	// Get the current value of the tiddler we're editing
	var tiddler = this.wiki.getTiddler(targetTitle);
	// Save the initial value of the draft tiddler
	draftTitle = this.generateDraftTitle(targetTitle);
	var draftTiddler = new $tw.Tiddler(
			tiddler,
			{
				title: draftTitle,
				"draft.title": targetTitle,
				"draft.of": targetTitle
			},
			this.wiki.getModificationFields()
		);
	this.wiki.addTiddler(draftTiddler);
	return draftTiddler;
};

/*
Generate a title for the draft of a given tiddler
*/
NavigatorWidget.prototype.generateDraftTitle = function(title) {
	var c = 0,
		draftTitle;
	do {
		draftTitle = "Draft " + (c ? (c + 1) + " " : "") + "of '" + title + "'";
		c++;
	} while(this.wiki.tiddlerExists(draftTitle));
	return draftTitle;
};

// Take a tiddler out of edit mode, saving the changes
NavigatorWidget.prototype.handleSaveTiddlerEvent = function(event) {
	var title = event.param || event.tiddlerTitle,
		tiddler = this.wiki.getTiddler(title),
		storyList = this.getStoryList();
	// Replace the original tiddler with the draft
	if(tiddler) {
		var draftTitle = (tiddler.fields["draft.title"] || "").trim(),
			draftOf = (tiddler.fields["draft.of"] || "").trim();
		if(draftTitle) {
			var isRename = draftOf !== draftTitle,
				isConfirmed = true;
			if(isRename && this.wiki.tiddlerExists(draftTitle)) {
				isConfirmed = confirm($tw.language.getString(
					"ConfirmOverwriteTiddler",
					{variables:
						{title: draftTitle}
					}
				));
			}
			if(isConfirmed) {
				// Create the new tiddler and pass it through the th-saving-tiddler hook
				var newTiddler = new $tw.Tiddler(this.wiki.getCreationFields(),tiddler,{
					title: draftTitle,
					"draft.title": undefined,
					"draft.of": undefined
				},this.wiki.getModificationFields());
				newTiddler = $tw.hooks.invokeHook("th-saving-tiddler",newTiddler);
				this.wiki.addTiddler(newTiddler);
				// Remove the draft tiddler
				this.wiki.deleteTiddler(title);
				// Remove the original tiddler if we're renaming it
				if(isRename) {
					this.wiki.deleteTiddler(draftOf);
				}
				if(!event.paramObject || event.paramObject.suppressNavigation !== "yes") {
					// Replace the draft in the story with the original
					this.replaceFirstTitleInStory(storyList,title,draftTitle);
					this.addToHistory(draftTitle,event.navigateFromClientRect);
					if(draftTitle !== this.storyTitle) {
						this.saveStoryList(storyList);
					}
				}
				// Trigger an autosave
				$tw.rootWidget.dispatchEvent({type: "tm-auto-save-wiki"});
			}
		}
	}
	return false;
};

// Take a tiddler out of edit mode without saving the changes
NavigatorWidget.prototype.handleCancelTiddlerEvent = function(event) {
	// Flip the specified tiddler from draft back to the original
	var draftTitle = event.param || event.tiddlerTitle,
		draftTiddler = this.wiki.getTiddler(draftTitle),
		originalTitle = draftTiddler && draftTiddler.fields["draft.of"];
	if(draftTiddler && originalTitle) {
		// Ask for confirmation if the tiddler text has changed
		var isConfirmed = true,
			originalTiddler = this.wiki.getTiddler(originalTitle),
			storyList = this.getStoryList();
		if(this.wiki.isDraftModified(draftTitle)) {
			isConfirmed = confirm($tw.language.getString(
				"ConfirmCancelTiddler",
				{variables:
					{title: draftTitle}
				}
			));
		}
		// Remove the draft tiddler
		if(isConfirmed) {
			this.wiki.deleteTiddler(draftTitle);
			if(!event.paramObject || event.paramObject.suppressNavigation !== "yes") {
				if(originalTiddler) {
					this.replaceFirstTitleInStory(storyList,draftTitle,originalTitle);
					this.addToHistory(originalTitle,event.navigateFromClientRect);
				} else {
					this.removeTitleFromStory(storyList,draftTitle);
				}
				this.saveStoryList(storyList);
			}
		}
	}
	return false;
};

// Create a new draft tiddler
// event.param can either be the title of a template tiddler, or a hashmap of fields.
//
// The title of the newly created tiddler follows these rules:
// * If a hashmap was used and a title field was specified, use that title
// * If a hashmap was used without a title field, use a default title, if necessary making it unique with a numeric suffix
// * If a template tiddler was used, use the title of the template, if necessary making it unique with a numeric suffix
//
// If a draft of the target tiddler already exists then it is reused
NavigatorWidget.prototype.handleNewTiddlerEvent = function(event) {
	// Get the story details
	var storyList = this.getStoryList(),
		templateTiddler, additionalFields, title, draftTitle, existingTiddler;
	// Get the template tiddler (if any)
	if(typeof event.param === "string") {
		// Get the template tiddler
		templateTiddler = this.wiki.getTiddler(event.param);
		// Generate a new title
		title = this.wiki.generateNewTitle(event.param || $tw.language.getString("DefaultNewTiddlerTitle"));
	}
	// Get the specified additional fields
	if(typeof event.paramObject === "object") {
		additionalFields = event.paramObject;
	}
	if(typeof event.param === "object") { // Backwards compatibility with 5.1.3
		additionalFields = event.param;
	}
	if(additionalFields && additionalFields.title) {
		title = additionalFields.title;
	}
	// Generate a title if we don't have one
	title = title || this.wiki.generateNewTitle($tw.language.getString("DefaultNewTiddlerTitle"));
	// Find any existing draft for this tiddler
	draftTitle = this.wiki.findDraft(title);
	// Pull in any existing tiddler
	if(draftTitle) {
		existingTiddler = this.wiki.getTiddler(draftTitle);
	} else {
		draftTitle = this.generateDraftTitle(title);
		existingTiddler = this.wiki.getTiddler(title);
	}
	// Merge the tags
	var mergedTags = [];
	if(existingTiddler && existingTiddler.fields.tags) {
		$tw.utils.pushTop(mergedTags,existingTiddler.fields.tags)
	}
	if(additionalFields && additionalFields.tags) {
		// Merge tags
		mergedTags = $tw.utils.pushTop(mergedTags,$tw.utils.parseStringArray(additionalFields.tags));
	}
	if(templateTiddler && templateTiddler.fields.tags) {
		// Merge tags
		mergedTags = $tw.utils.pushTop(mergedTags,templateTiddler.fields.tags);
	}
	// Save the draft tiddler
	var draftTiddler = new $tw.Tiddler({
			text: "",
			"draft.title": title
		},
		templateTiddler,
		existingTiddler,
		additionalFields,
		this.wiki.getCreationFields(),
		{
			title: draftTitle,
			"draft.of": title,
			tags: mergedTags
		},this.wiki.getModificationFields());
	this.wiki.addTiddler(draftTiddler);
	// Update the story to insert the new draft at the top and remove any existing tiddler
	if(storyList.indexOf(draftTitle) === -1) {
		var slot = storyList.indexOf(event.navigateFromTitle);
		storyList.splice(slot + 1,0,draftTitle);
	}
	if(storyList.indexOf(title) !== -1) {
		storyList.splice(storyList.indexOf(title),1);		
	}
	this.saveStoryList(storyList);
	// Add a new record to the top of the history stack
	this.addToHistory(draftTitle);
	return false;
};

// Import JSON tiddlers into a pending import tiddler
NavigatorWidget.prototype.handleImportTiddlersEvent = function(event) {
	var self = this;
	// Get the tiddlers
	var tiddlers = [];
	try {
		tiddlers = JSON.parse(event.param);	
	} catch(e) {
	}
	// Get the current $:/Import tiddler
	var importTiddler = this.wiki.getTiddler(IMPORT_TITLE),
		importData = this.wiki.getTiddlerData(IMPORT_TITLE,{}),
		newFields = new Object({
			title: IMPORT_TITLE,
			type: "application/json",
			"plugin-type": "import",
			"status": "pending"
		}),
		incomingTiddlers = [];
	// Process each tiddler
	importData.tiddlers = importData.tiddlers || {};
	$tw.utils.each(tiddlers,function(tiddlerFields) {
		var title = tiddlerFields.title;
		if(title) {
			incomingTiddlers.push(title);
			importData.tiddlers[title] = tiddlerFields;
		}
	});
	// Give the active upgrader modules a chance to process the incoming tiddlers
	var messages = this.wiki.invokeUpgraders(incomingTiddlers,importData.tiddlers);
	$tw.utils.each(messages,function(message,title) {
		newFields["message-" + title] = message;
	});
	// Deselect any suppressed tiddlers
	$tw.utils.each(importData.tiddlers,function(tiddler,title) {
		if($tw.utils.count(tiddler) === 0) {
			newFields["selection-" + title] = "unchecked";
		}
	});
	// Save the $:/Import tiddler
	newFields.text = JSON.stringify(importData,null,$tw.config.preferences.jsonSpaces);
	this.wiki.addTiddler(new $tw.Tiddler(importTiddler,newFields));
	// Update the story and history details
	if(this.getVariable("tv-auto-open-on-import") !== "no") {
		var storyList = this.getStoryList(),
			history = [];
		// Add it to the story
		if(storyList.indexOf(IMPORT_TITLE) === -1) {
			storyList.unshift(IMPORT_TITLE);
		}
		// And to history
		history.push(IMPORT_TITLE);
		// Save the updated story and history
		this.saveStoryList(storyList);
		this.addToHistory(history);		
	}
	return false;
};

// 
NavigatorWidget.prototype.handlePerformImportEvent = function(event) {
	var self = this,
		importTiddler = this.wiki.getTiddler(event.param),
		importData = this.wiki.getTiddlerDataCached(event.param,{tiddlers: {}}),
		importReport = [];
	// Add the tiddlers to the store
	importReport.push($tw.language.getString("Import/Imported") + "\n");
	$tw.utils.each(importData.tiddlers,function(tiddlerFields) {
		var title = tiddlerFields.title;
		if(title && importTiddler && importTiddler.fields["selection-" + title] !== "unchecked") {
			self.wiki.addTiddler(new $tw.Tiddler(tiddlerFields));
			importReport.push("# [[" + tiddlerFields.title + "]]");
		}
	});
	// Replace the $:/Import tiddler with an import report
	this.wiki.addTiddler(new $tw.Tiddler({
		title: event.param,
		text: importReport.join("\n"),
		"status": "complete"
	}));
	// Navigate to the $:/Import tiddler
	this.addToHistory([event.param]);
	// Trigger an autosave
	$tw.rootWidget.dispatchEvent({type: "tm-auto-save-wiki"});
};

NavigatorWidget.prototype.handleFoldTiddlerEvent = function(event) {
	var self = this,
		paramObject = event.paramObject || {};
	if(paramObject.foldedState) {
		var foldedState = this.wiki.getTiddlerText(paramObject.foldedState,"show") === "show" ? "hide" : "show";
		this.wiki.setText(paramObject.foldedState,"text",null,foldedState);
	}
};

NavigatorWidget.prototype.handleFoldOtherTiddlersEvent = function(event) {
	var self = this,
		paramObject = event.paramObject || {},
		prefix = paramObject.foldedStatePrefix;
	$tw.utils.each(this.getStoryList(),function(title) {
		self.wiki.setText(prefix + title,"text",null,event.param === title ? "show" : "hide");
	});
};

NavigatorWidget.prototype.handleFoldAllTiddlersEvent = function(event) {
	var self = this,
		paramObject = event.paramObject || {},
		prefix = paramObject.foldedStatePrefix;
	$tw.utils.each(this.getStoryList(),function(title) {
		self.wiki.setText(prefix + title,"text",null,"hide");
	});
};

NavigatorWidget.prototype.handleUnfoldAllTiddlersEvent = function(event) {
	var self = this,
		paramObject = event.paramObject || {},
		prefix = paramObject.foldedStatePrefix;
	$tw.utils.each(this.getStoryList(),function(title) {
		self.wiki.setText(prefix + title,"text",null,"show");
	});
};

NavigatorWidget.prototype.handleRenameTiddlerEvent = function(event) {
	var self = this,
		paramObject = event.paramObject || {},
		from = paramObject.from || event.tiddlerTitle,
		to = paramObject.to;
	$tw.wiki.renameTiddler(from,to);
};

exports.navigator = NavigatorWidget;

})();
