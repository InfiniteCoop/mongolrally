$(document).ready(function() {

	//Trigger slide animation on button click
	$(".splash-arrow").click(function()
	{
		$(".splash").slideUp("800", function() {
			$(".content-wrapper").delay(100).animate({"opacity":"1.0"},800);
		});
	});

	//Trigger slide animation on scroll
	$(window).mousewheel(function() {
		console.log("Mousewheel");
		$(".splash").slideUp("800", function() {
			$("html, body").animate({"scrollTop":"0px"},100);
		});
	});

});	