define([
	'dojo/topic',
	'dojo/_base/array',
	'dojo/dom-geometry',
	'dojo/_base/connect',
	'dijit/registry',
	'esri/map',
	'esri/layers/CSVLayer',
	'esri/layers/FeatureLayer',
	'esri/Color',
	'esri/symbols/SimpleMarkerSymbol',
	'esri/renderers/UniqueValueRenderer',
	'lib-app/jquery',
	'lib-app/jquery.mousewheel',
	'lib-build/css!./css/styles.css'
	],
	function(
		topic,
		array,
		domGeom,
		connect,
		registry,
		Map,
		CSVLayer,
		FeatureLayer,
		Color,
		SimpleMarkerSymbol,
		UniqueValueRenderer
		){

	// The application is ready
	topic.subscribe("tpl-ready", function(){

		//Overview map hidden by default
		$(".sliding-panel").toggleClass("panel-active");

		
		//Update text in 2D/3D toggle button
		var setSwitcherText = function() {
			if (window.appID == 'f9bfd5bb5f3244ce9e655de57b2e694d') {
				$("#switcher-button").text("switch to 2d version");
			}
			else {
				$("#switcher-button").text("swich to 3d version");
			}
		};			


		var baseURL = window.location.href.split("?")[0];

		//Switch between 2D and 3D versions of the map when the button is clicked. The two versions have 
		// separate app IDs, which are set in index.html when the page loads. Due to a known bug, it's currently
		// impossible to automatically scroll to the same section when the page refreshes. 
		$("#map-switcher-container").click(function() {
			if (window.appID == 'f9bfd5bb5f3244ce9e655de57b2e694d') {
				window.location.replace(baseURL + "?map=2d");
			}
			else {
				window.location.replace(baseURL);
			}
		});

		//Trigger text update
		setSwitcherText();

		//Hide splash page on scroll/button click
		var showApp = function () {
			$(".splash").slideUp("800", function() {
				$(".content-wrapper").delay(100).animate({"opacity":"1.0"},800);
			});
		};

		//Trigger slide animation
		$(".splash-arrow").on('click',showApp);
		$('.splash').on('mousewheel',showApp);


		//Toggle index map when overview button is clicked
		$("#bt").click(function() {
			$(".sliding-panel").toggleClass("panel-active");
			console.log("Sliding panel clicked");
		});

		/*  OVERVIEW MAP IN SIDEBAR  */

		//Map CSV fields to JS variables;
		var LabelField = 'Label';
		var StoryIndexField = 'StoryIndex';
		var ActiveField = 'Active';

		// Set map marker colors
		var defaultMarkerColor = new Color([100,100,100, 1]);
		var activeMarkerColor = new Color([0,151,251, 1]);

		// Path to CSV file
		var csvPath = 'resources/index-map/index-map-layer.csv';

		// Variable to store selected graphic
		var selectedGraphic = false;

		// Remove the help text tooltip after the user first clicks on the map (not currently used)
		$('#index-map').click(function(){
			$('#index-map-helper').removeClass('active');
		});

		// Create default map extent and spatial reference
		var startExtent = new esri.geometry.Extent(-420000, 4200000, 12200000, 7200000,
			new esri.SpatialReference({wkid:102100}) );

		// Create the index map with minimal UI;
		var indexMap = new Map('index-map',{
			slider: false,
			logo: false,
			showAttribution: false,
			extent: startExtent,
			fitExtent: true
		});

		//Disable all map controls
		indexMap.on("load", function(){
			console.log("Map loaded");
			indexMap.disableMapNavigation();
			indexMap.disableKeyboardNavigation();
			indexMap.disablePan();
			indexMap.disableRubberBandZoom();
			indexMap.disableScrollWheelZoom();


			// Variables used for responsive map
			var resizeTimer;
			var height = $("#index-map").height();

			// Redraw map if container width changes; don't redraw when height changes
			indexMap.on("resize", function(){

				if (height == $("#index-map").height()) {
					console.log("Map width has changed; redrawing map");

					clearTimeout(resizeTimer);
					resizeTimer = setTimeout(function() {
						indexMap.setExtent(startExtent,true);
						indexMap.reposition();
					}, 500);
				}
				else {
					console.log("Map width has not changed; not redrawing map");
				}
			});
		});

		//Create line layer from Feature Service
		var lineLayer = new FeatureLayer("http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Mongol_Rally_Route/FeatureServer/0");

		//Create country layer from Feature Service
		var countriesLayer = new FeatureLayer("http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/VisitedCountriesGeneralized/FeatureServer/0");

		// Load CSV File as point later
		var indexMapLayer = new CSVLayer(csvPath);

		// Create simple point symbols
		var activeMarker =  new SimpleMarkerSymbol('solid', 12, null, activeMarkerColor);
		var defaultMarker = new SimpleMarkerSymbol('solid', 9, null, defaultMarkerColor);

		// Change the CSV Layer renderer to use the symbols we just created
		var renderer = new UniqueValueRenderer(defaultMarker,ActiveField);
		renderer.addValue('TRUE', activeMarker);
		indexMapLayer.setRenderer(renderer);

		// Add countries layer to map
		indexMap.addLayer(countriesLayer,0);

		//Add path layer to map
		indexMap.addLayer(lineLayer,1);

		// Add CSV layer to map
		indexMap.addLayer(indexMapLayer,2);

		// Select current section in index map on Loading
		setIconDisplay(app.data.getCurrentSectionIndex());

		// Add map events
		indexMapLayer.on('click',function(event){
			$('#index-map-helper').removeClass('active');
			hideIndexMapInfo();
			topic.publish('story-navigate-section', event.graphic.attributes[StoryIndexField]);
		});

		indexMapLayer.on('mouse-over',function(event){
			indexMap.setCursor('pointer');
			setIndexMapInfo(event.graphic);
		});

		indexMapLayer.on('mouse-out',function(){
			indexMap.setCursor('default');
			hideIndexMapInfo();
		});

		indexMap.on('extent-change',function(){
			indexMap.setCursor('default');
			hideIndexMapInfo();
			moveSelectedToFront();
		});

		topic.subscribe('story-load-section', setIconDisplay);

		// Select current section in index map (Update symbol color)
		function setIconDisplay(index){
			selectedGraphic = false;
			if (index !== null){
				array.forEach(indexMapLayer.graphics,function(g){
					if (g.attributes[StoryIndexField].toString() === index.toString()){
						g.attributes[ActiveField] = 'TRUE';
						if(g.getDojoShape()){
							selectedGraphic = g;
							g.getDojoShape().moveToFront();
						}
					}
					else{
						g.attributes[ActiveField] = 'FALSE';
					}
				});
				indexMapLayer.redraw();
			}
		}

		// Make sure selected point is on top.
		function moveSelectedToFront(){
			if (selectedGraphic && selectedGraphic.getDojoShape()) {
				selectedGraphic.getDojoShape().moveToFront();
			}
		}

		// Hide point tooltip
		function hideIndexMapInfo(){
			$('#index-map-info').hide();
		}

		// Show point tooltip
		function setIndexMapInfo(graphic){
			$('#index-map-info').html(graphic.attributes[LabelField]);
			if (graphic.getDojoShape()){
				graphic.getDojoShape().moveToFront();
			}
			positionIndexMapInfo(graphic);
		}

		// Move tooltip next to selected point
		function positionIndexMapInfo(graphic){
			var pos = domGeom.position(graphic.getNode());
			$('#index-map-info').css({
				'top': pos.y - (pos.h/2) - 3,
				'left': pos.x + pos.w
			}).show();
		}
	});
});