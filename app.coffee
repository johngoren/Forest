Tree = Backbone.Model.extend(
  defaults: ->
    name: "Generic Tree"
    scientificName: "Generic Latin Name"
    sortKey: "name"
    height: ["tall"]
    spread: ["medium"]
    growth: ["justmoderate"]
    foliage: ["evergreen"]
    fruit: "not showy"
    bloom: "not showy"
    wateringneeds: ["justmoderate"]
    treecareneeds: ["justmoderate"]
    droughttolerant: "yes"
    soiltype: "any"
    toleratesshade: "yes"
    toleratessalt: "no"
    windtolerance: "yes"
    url: "#"
    thumbnail: "http://fuf.mightyminnow.com/wp-content/plugins/treepress/img/tree.png"
    blurb: "Coming soon."
    notabletraits: "Coming soon."
    shown: true

  # Override default fetch.
  fetch: ->

  # Extract Wordpress custom fields, which have been serialized and would otherwise be inaccessible
  parse: (json) ->
    _.mixin wordpress: (string) ->
      if string?  
          theHash = customFields["wpcf-" + string][0]  if customFields["wpcf-" + string]?
          theArray = _.values(unserialize(theHash))  if theHash?
        theArray
        
    posts = json.posts
    for post in posts
      newTree = new Tree
      customFields = post.custom_fields
      newTree.set "name", post.title
      newTree.set "url", post.url
      newTree.set "scientificName", customFields["wpcf-scientific"]  if customFields["wpcf-scientific"]?
      newTree.set "notabletraits", customFields["wpcf-notabletraits"]  if customFields["wpcf-notabletraits"]?
      newTree.set "height", _("height").wordpress()
      newTree.set "spread", _("spread").wordpress()
      newTree.set "growth", _("growth").wordpress()
      newTree.set "foliage", _("foliage").wordpress()
      newTree.set "wateringneeds", _("wateringneeds").wordpress()
      newTree.set "treecareneeds", _("treecareneeds").wordpress()
      newTree.set "soiltype", _("soiltype").wordpress()
      newTree.set "windtolerance", _("windtolerance").wordpress()
      newTree.set "fruit", customFields["wpcf-fruit"][0]  if customFields["wpcf-fruit"]?
      newTree.set "bloom", customFields["wpcf-bloom"][0]  if customFields["wpcf-bloom"]?
      newTree.set "droughttolerant", customFields["wpcf-droughttolerant"][0]  if customFields["wpcf-droughttolerant"]?
      newTree.set "toleratesshade", customFields["wpcf-toleratesshady"][0]  if customFields["wpcf-toleratesshady"]?
      newTree.set "toleratessalt", customFields["wpcf-toleratessalty"][0]  if customFields["wpcf-toleratessalty"]?
      newTree.set "thumbnail", post.thumbnail_images.medium.url  if post.thumbnail_images
      Trees.add newTree

    App = new AppView
    do App.restoreState
    if jQuery(".scientificName").is(":checked")
      Trees.sortByType "scientificName"
    else
      Trees.sortByType "name"
    do App.reDraw

  initialize: ->
)
TreeList = Backbone.Collection.extend(
  model: Tree
  url: "/wp-content/plugins/treepress/js/updaterdump.json"
  sortByType: (type) ->
    @sortKey = type
    @sort()

  initialize: ->

  comparator: (item) ->
    (if @sortKey is "name" then item.get(@sortKey) else item.get(@sortKey))
)
Trees = new TreeList
Trees.fetch add: true
TreeView = Backbone.View.extend(
  tagName: "div"
  initialize: ->
    @model.bind "change", @render, this
    @model.bind "change:shown", @showhide, this

  
  ###
  Fade a tree in or out of the view
  ###
  showhide: ->
    showItOrNot = @model.attributes.shown
    if showItOrNot is false
      @$el.css 'display','none'
    else
      @$el.css 'display','block'

  
  # Render an individual tree.
  # Consider _.template inline http://ricostacruz.com/backbone-patterns/#inline_templates

  render: (tree) ->
    visible = tree.get("shown")
    return this unless visible
    name = tree.get("name")
    if name is "Generic Tree" then return this
    scientificName = tree.get("scientificName")
    url = tree.get("url")
    linkopen = "<a class=\"hoveroverme\" href=\"" + url + "\">"
    span1 = "<span>"
    span2 = "<span class=\"secondcolumn\">"
    spanclose = "</span>"
    popupopen = "<div class=\"hoverImage\" style=\"display: none;\">"
    popupimg = "<img src=\"" + tree.get("thumbnail")
    popupimg = popupimg + "\" alt=\"tree\" class=\"attachment-post-thumbnail wp-post-image\"/>"
    popuphed = "<h3>" + tree.get("name") + "</h3>"
    popupblurb = "<p class=\"treeblurb\">" + tree.get("notabletraits") + "</p>"
    popupclose = "</div>"
    popup = popupopen + popupimg + popuphed + popupblurb + popupclose
    outputString = span1 + linkopen + name + "</a>" + spanclose + span2 + linkopen + "<em>" + scientificName + "</em>" + popup + "</a>" + spanclose
    @$el.html outputString
    this
)
AppView = Backbone.View.extend(
  el: jQuery("#wrap")
  
  ###
  Is this a modern browser that supports LocalStorage?
  ###
  supportsStorage: ->
    try
      localStorage.setItem mod, mod
      localStorage.removeItem mod
      return true
    catch e
      return false
  
  ###
  Restore and set the "shown" values so it looks like last time you were here
  ###
  restoreState: ->
    return this  unless @supportsStorage
    emptyCheckboxes = jQuery("input:checkbox:not(:checked)")
    return this  if emptyCheckboxes.length is 0 # Don't bother hiding trees if the form has no empty checkboxes
    Trees.each (tree) =>
      theName = tree.get("name")
      savedState = localStorage.getItem(theName)
      tree.set shown: false  unless savedState is "true"
      @decideWhichTreesAreAcceptable

    @clearState()

  clearState: ->
    sessionStorage.clear

  
  ###
  Store the list of all trees with their Shown value, for consistency when you come back
  ###
  saveState: ->
    sortState = jQuery("input:radio[name=sortby]:checked").val()
    
    # TK: find out what the current sort key is and save it
    # Find out from radio 14_0, name="sortby"
    # ("input:radio[name=sortby]").val();
    # this should be written as a key-value that we will restore later
    if @supportsStorage
      hiddenTrees = new Array() # Is this even used anymore?
      Trees.each (tree) ->
        name = tree.get("name")
        visibility = tree.get("shown")
        localStorage.setItem name, visibility
        
        # Save sort
        localStorage.setItem "sortstate", sortState


  events:
    "change input": "formEvent"
    "change select": "formEvent"
    change: "hoverBind"
    "click .resetbutton": "resetEverything"

  
  ###
  Ensures every tree is both bound to a hover, and has its show/hide state stored locally
  ###
  resetEverything: ->
    jQuery("#gform_2 :checkbox").each ->
      jQuery(this).attr "checked", true

    jQuery("#gform_2 select").each ->
      jQuery(this).val 0

    Trees.each (tree) ->
      tree.set shown: true

    @reDraw()
    sessionStorage.clear

  hoverBind: ->
    @saveState()
    jQuery("a.hoveroverme").hover (->
      jQuery(this).parent("span").parent("div").find("div.hoverImage").css "display", "block"
    ), ->
      jQuery(this).parent("span").parent("div").find("div.hoverImage").css "display", "none"

  initialize: ->
    jQuery("form").sisyphus
      timeout: 3
      customKeyPrefix: "form_"
      onRestore: ->

      onRelease: ->

    Trees.bind "reset", @reDraw, this

  reDraw: ->
    jQuery("#treetable").empty()
    @render()

  render: ->
    Trees.each @addOne
    @hoverBind()

  addOne: (tree) ->
    view = new TreeView(model: tree)
    @jQuery("#treetable").append view.render(tree).el
  
  purgeCombo: (key, value) ->
    Trees.each (tree) ->
      treeQualityArray = tree.get(key)
      isItPresent = _.indexOf(treeQualityArray, value)
      tree.set shown: false if isItPresent > -1
    
  formEvent: (event) ->
    eventType = event.target.type
    classArray = event.target.classList or event.srcElement.className.split(/\s+/)
    switch eventType
      when "checkbox" # Most of the choices are checkboxes
        key = classArray[0]
        value = classArray[1]
        checkedStatus = event.target.checked
        if checkedStatus
          do @decideWhichTreesAreAcceptable
        else
          @purgeCombo key, value    
      when "radio" # Sorting
        Trees.sortByType event.target.className
        return this
      when "select-one" # Pulldown choices
        do @decideWhichTreesAreAcceptable
  
  getCheckboxKey: (object) ->
    classes = jQuery(object).attr("class")
    classArray = classes.split(" ")
    classKey = classArray[0]
    
  getCheckboxValue: (object) ->
    classes = jQuery(object).attr("class")
    classArray = classes.split(" ")
    valueState = classArray[1]    
    
  eliminateCheckboxTrait: (checkboxObject) -> 
    checkboxKey = @getCheckboxKey checkboxObject
    checkboxValue = @getCheckboxValue checkboxObject
    @purgeCombo checkboxKey, checkboxValue
  
  mustBePresent: (selectKey, selectValue) ->
    Trees.each (tree) ->
      quality = tree.get(selectKey)
      if quality isnt selectValue
        tree.set shown: false
          
  decideWhichTreesAreAcceptable: ->
    Trees.each (tree) =>
      tree.set shown: true
    jQuery("input:checkbox:not(:checked)").each (index, value) =>
      @eliminateCheckboxTrait value
    jQuery("select").each (index, value) =>
      chosenValue = jQuery(value).val()
      if chosenValue.charAt(0) isnt "d"
        @mustBePresent jQuery(value).attr("class").split(" ")[0], chosenValue
)