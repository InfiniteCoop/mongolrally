$(document).ready(function() {
	$(".splash-arrow").click(function()
	{
		$(".splash").slideUp("800", function() {
			$(".content-wrapper").delay(100).animate({"opacity":"1.0"},800);
		});
	});

	$("#bt").click(function() {
		$(".sliding-panel").toggleClass("panel-active");
		console.log("Sliding panel clicked");
	});

	$(window).mousewheel(function() {
		console.log("Mousewheel");
		$(".splash").slideUp("800", function() {
			$("html, body").animate({"scrollTop":"0px"},100);
		});
	});

});	