// Loading all required dojo and esri modules used in index map
require([
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
	'esri/renderers/UniqueValueRenderer'
	], function(
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
		) {
	// Custom Javascript to be executed while the application is initializing goes here

	// The application is ready
	topic.subscribe("tpl-ready", function(){

		//Toggle index map when overview button is clicked
		$("#bt").click(function() {
			$(".sliding-panel").toggleClass("panel-active");
			console.log("Sliding panel clicked");
		});

		// CONFIGURATION VARIABLES START
		// Update the label fields for those used in your CSV file. Be sure that it matches
		// exactly (including case)
		var LabelField = 'Label';
		var StoryIndexField = 'StoryIndex';
		var ActiveField = 'Active';
		// Change the colors of the default and active symbols on the map.
		// Color documentation available here:
		// https://dojotoolkit.org/reference-guide/1.10/dojo/_base/Color.html
		var defaultMarkerColor = new Color([100,100,100, 1]);
		var activeMarkerColor = new Color([0,151,251, 1]);

		// The path to CSV point file
		var csvPath = 'resources/index-map/index-map-layer.csv';

		// variable stores currently selected graphic
		var selectedGraphic = false;

		// Removes the help text tooltip after the user first clicks on the map
		$('#index-map').click(function(){
			$('#index-map-helper').removeClass('active');
		});

		// Create default map extent
		var startExtent = new esri.geometry.Extent(-420000, 4200000, 12200000, 7200000,
			new esri.SpatialReference({wkid:102100}) );

		// Create the index map
		var indexMap = new Map('index-map',{
			// Change the following options to set the default view of your index map.
			// Option documentation is here:
			// https://developers.arcgis.com/javascript/jsapi/map-amd.html#map1
			slider: false,
			logo: false,
			showAttribution: false,
			extent: startExtent,
			fitExtent: true
		});

		indexMap.on("load", function(){
			console.log("Map loaded");
			indexMap.disableMapNavigation();
			indexMap.disableKeyboardNavigation();
			indexMap.disablePan();
			indexMap.disableRubberBandZoom();
			indexMap.disableScrollWheelZoom();


			// Reset map extent when container is resized	
			var resizeTimer;
			var height = $("#index-map").height();

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
				};
			});
		});

		//Create line layer from Feature Service
		var lineLayer = new FeatureLayer("http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Mongol_Rally_Route/FeatureServer/0");

		var countriesLayer = new FeatureLayer("http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/VisitedCountriesGeneralized/FeatureServer/0");

		// Load CSV File as point later
		var indexMapLayer = csv = new CSVLayer(csvPath);

		// Create simple point symbols
		var activeMarker =  new SimpleMarkerSymbol('solid', 12, null, activeMarkerColor);
		var defaultMarker = new SimpleMarkerSymbol('solid', 9, null, defaultMarkerColor);

		// Change the CSV Layer renderer to use the symbols we just created
		var renderer = new UniqueValueRenderer(defaultMarker,ActiveField);
		renderer.addValue('TRUE', activeMarker);
		indexMapLayer.setRenderer(renderer);


		// Add countries Feature Layer to map
		indexMap.addLayer(countriesLayer,0);

		//Add path Feature Layer to map
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
			if (selectedGraphic) {
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