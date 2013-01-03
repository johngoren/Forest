(function ($) {
	"use strict";
	
	/**
	 * 	We've designed the HTML form so that checkboxes -- i.e. "Height: Tall" -- hold key-value pairs in the classes ("height tall")
	 *  Those key-value pairs match the ones in the models, making it easy to eliminate filtered-out items. 
	 *  This function pulls those out as an array to work with.
	 *  (Yeah, we could have used HTML attributes. But because we had to work with a form designed in Gravity Forms,
	 *  we had to end-run around that plugin's unfortunate arcane naming conventions.)
	 */ 
	 
	function retrieveClassArray(value) {
		var classes = $(value).attr("class");
		var classArray = classes.split(" ");
		return classArray;
	}	
	
	/*** 
	  *
	  *  The tree model
	  *
	  */
	   
	var Tree = Backbone.Model.extend({
		defaults: function () {
			return {
				name: "Generic Tree",
				scientificName: "Generic Latin Name",
				sortKey: "name",
				height: ["tall"],
				spread: ["medium"],
				growth: ["justmoderate"],
                foliage: ["evergreen"],
                fruit: "default",
                bloom: "default",
                wateringneeds: ["justmoderate"],
                treecareneeds: ["justmoderate"],
                droughttolerant: "yes",
                soiltype: "anysoiltype",
                toleratesshade: "default",
                toleratessalt: "default",
                windtolerance: "yes",
                url: "#",
                thumbnail: "http://fuf.mightyminnow.com/wp-content/plugins/treepress/img/tree.png",
                blurb: "Coming soon.",
                notabletraits: "Coming soon.",
                shown: true,
            };
        },
        
        /**
         *  In which the tree looks within and considers its own desirability.
         *
         */
				
        acceptable: function () {
            var isItOK = true;
            var thisTree = this;									
			
			// Consider all checkboxes. Does any one of them disqualify me?
			$("input:checkbox:not(:checked)").each(function (index, value) {
				var classArray = retrieveClassArray(value);
				var testQuality = classArray[0];
				var testValue = classArray[1];
				var ourValue = thisTree.get(testQuality);			// In this case, what value are we looking at?
				var present = _.indexOf(ourValue, testValue);		// It's an array so we look for the unwanted item that will disqualify
				if (present > -1) {
					isItOK = false;	
					return false;									// Break out of loop to save cycles
				}
			});

			// Do likewise for select bars.			
			$("option:selected:not(:first-child)").each(function () {		// Don't worry if selected option is default, "doesn't matter"
				var pulldownQuality = $(this).parent().attr('class').split(' ')[0];
				var pulldownValue = $(this).val();
				var ourValue = thisTree.get(pulldownQuality);
				if (ourValue == pulldownValue) {
					
				}
				else {
					if (ourValue !== undefined) {
						isItOK = false;
					}
				}
			});
			
			return isItOK;

		},

        fetch: function () {},

        parse: function (json) {
            var posts = json.posts;

            // "wpcf," because they came out stamped that way by the Wordpress Custom Fields (wpcf) plugin.

            var basicTraits = {
                scientificName: "wpcf-scientific",
                notabletraits: "wpcf-notabletraits"
            };

            var traitsHash = {
                fruit: "wpcf-fruit",
                bloom: "wpcf-bloom",
                droughttolerant: "wpcf-droughttolerant",
                toleratesshade: "wpcf-toleratesshady",
                toleratessalt: "wpcf-toleratessalty"
            };

            var serializedTraitsToSet = ["height", "spread", "growth", "foliage", "wateringneeds", "treecareneeds", "soiltype", "windtolerance"];

            _.each(posts, function (post) {
                var newTree = new Tree();
                var customFields = post.custom_fields;
                newTree.set("name", post.title);
                newTree.set("url", post.url);

                // Hash of the basic traits. Others will need unserialization because of how Wordpress and the Types plugin store data.
                // Word of advice: Make your own JSON stream rather than relying on a plugin like we did. :(
                				
                for (var key in basicTraits) {
                    if (customFields[basicTraits[key]] !== undefined) {
                        newTree.set(key, customFields[basicTraits[key]]);
                    }
                }

                for (key in traitsHash) {
					newTree.set(key, customFields[traitsHash[key]]);
                }

                // These nuts needed some extra cracking because of how Wordpress serializes data

                _.each(serializedTraitsToSet, function (trait) {
                    if (customFields["wpcf-" + trait][0] !== undefined) {
                        var theHash = customFields["wpcf-" + trait][0];
                        var theArray = _.values(unserialize(theHash));
                        newTree.set(trait, theArray);
                    }
                });
                if (post.thumbnail_images) {
                    newTree.set("thumbnail", post.thumbnail_images.medium.url);
                }

                Trees.add(newTree);
            }); // End of loop

            var App = new AppView();
            App.restoreState();
            App.render();
        },
        initialize: function () {}
    }); // End of Tree

    var TreeList = Backbone.Collection.extend({
        model: Tree,
        url: '/wp-content/plugins/treepress/js/updaterdump.json',
        sortByType: function (type) {
            this.sortKey = type;
            this.sort();
        },
        initialize: function () {
            if ($('.scientificName').is(':checked')) {
                this.sortKey = 'scientificName';
            } else {
                this.sortKey = 'name';
            }
        },
        comparator: function (item) {
        	// Trick ensures that Backbone re-evaluates the sortKey rather than refusing to rethink after initial evaluation
            return this.sortKey === 'name' ? item.get(this.sortKey) : item.get(this.sortKey);
        }
    }); // End of TreeList

    var Trees = new TreeList();

    Trees.fetch({
        add: true
    }); // Add all new models to the collection

    var TreeView = Backbone.View.extend({
        tagName: "div",
        initialize: function () {
            this.model.bind('change', this.render, this);
            this.model.bind('change:shown', this.showhide, this);
        },

        /**
         *  Fade a tree in or out of the view
         */

        showhide: function () {
            var showItOrNot = this.model.attributes.shown;
            if (showItOrNot === false) {
                return this.$el.fadeTo("slow", 0.00).slideUp({
                    duration: 400,
                    easing: "swing"
                });
            } else {
				// Make it show up again
                this.$el.fadeTo("slow", 1.00);
            }
        },
        
        /**
         *  Render an individual tree. 
         */

        render: function (tree) {
            var visible = tree.get("shown");
            if (!visible) {
                return this;
            }
            var name = tree.get("name");
            var scientificName = tree.get("scientificName");
            var url = tree.get("url");
            var linkopen = '<a class="hoveroverme" href="' + url + '">';
            var span1 = '<span>';
            var span2 = '<span class="secondcolumn">';
            var spanclose = '</span>';
            var popupopen = '<div class="hoverImage" style="display: none;">';
            var popupimg = '<img src="' + tree.get("thumbnail");
            popupimg = popupimg + '" alt="tree" class="attachment-post-thumbnail wp-post-image"/>';
            var popuphed = '<h3>' + tree.get("name") + '</h3>';
            var popupblurb = '<p class="treeblurb">' + tree.get("notabletraits") + '</p>';
            var popupclose = '</div>';
            var popup = popupopen + popupimg + popuphed + popupblurb + popupclose;
            var outputString = span1 + linkopen + name + '</a>' + spanclose + span2 + linkopen + '<em>' + scientificName + '</em>' + popup + '</a>' + spanclose;
            this.$el.html(outputString);
            return this;
        }
    });

    var AppView = Backbone.View.extend({
        el: jQuery('#wrap'),

        /**
         *  Is this a modern browser that supports LocalStorage?
         */
        supportsStorage: function () {
            try {
                localStorage.setItem(mod, mod);
                localStorage.removeItem(mod);
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         *  Restore and set the "shown" values, recapturing the situation from last time you visited the page
         */
        restoreState: function () {
            if (!this.supportsStorage) {
                return this;
            }
            var emptyCheckboxes = jQuery("input:checkbox:not(:checked)");
            if (emptyCheckboxes.length === 0) {
                return this; // Don't bother hiding trees if the form has no empty checkboxes			
            }
            Trees.each(function (tree) {
                var theName = tree.get("name");
                var savedState = localStorage.getItem(theName);
                if (savedState !== "true") {
                    tree.set({
                        shown: false
                    });
                }
            });
            this.clearState();
        },

        clearState: function () {
            sessionStorage.clear();
        },

        /**
         * Store the list of all trees with their Shown value, for consistency when you come back
         */

        saveState: function () {
            if (this.supportsStorage) {
                Trees.each(function (tree) {
                    var name = tree.get("name");
                    var visibility = tree.get("shown");
                    localStorage.setItem(name, visibility);
                });
            }
        },

        events: {
            "change input": "formEvent",
            "change select": "formEvent",
            "change": "hoverBind"
        },

        /**
         *  Ensures every tree is both bound to a hover, and has its show/hide state stored locally
         */

        hoverBind: function () {
            this.saveState();
            jQuery('a.hoveroverme').hover(

            function () {
                jQuery(this).parent('span').parent('div').find('div.hoverImage').css('display', 'block');
            },

            function () {
                jQuery(this).parent('span').parent('div').find('div.hoverImage').css('display', 'none');
            });
        },

        initialize: function () {
            jQuery('form').sisyphus({
                timeout: 3,
                customKeyPrefix: 'form_',
                 onRestore: function() {
					if ($('input#choice_14_0').is(':checked')) {
						Trees.sortByType('scientificName');
					}		
                },
                onRelease: function () {}
            });
            Trees.bind('reset', this.reDraw, this);
        },

        reDraw: function () {
            jQuery('#treetable').empty();
            this.render();
        },

        render: function () {
            Trees.each(this.addOne);
            this.hoverBind();
        },
        
        addOne: function (tree) {
            var view = new TreeView({
                model: tree
            });
            jQuery('#treetable').append(view.render(tree).el);

        },

        /**
         * Delegate for all form events
         */

        formEvent: function (event) {
            var eventType = event.target.type;
            var classArray = event.target.classList || event.srcElement.className.split(/\s+/);
            switch (eventType) {
                case "checkbox":
                    this.toggleShown();
                    break;
                case "radio":
                	Trees.sortByType(event.target.className);
                	return this;
                case "select-one":
                    this.toggleShown();
                    break;
                default:
                    break;
            }
        },

        /**
         * Toggles whether items are seen.
         */
		
        toggleShown: function () {
            Trees.each(function (tree) {
				var isThisTreeOK = tree.acceptable();
				if (isThisTreeOK === false) {
					tree.set({
						shown: false
					});
				}
				else {
					tree.set({
						shown: true
					});
				}
            });
        }
    });
})(jQuery);