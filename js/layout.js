$(function(){

	// menu 
	$('.menuicon').click(function(event) {
		$('.menu').fadeIn();			
	});
	
	$('.cancelicon').click(function(event) {
		$('.menu').fadeOut();	
	});

	// chat
	$('.header .r_hcont .second .h_btn.chat').click(function(event) {
		var self = $(this);
		$('.chatbox').slideToggle();	
		if (self.hasClass("off")) {
			self.removeClass("off").addClass("on");
		} else {
            self.removeClass("on").addClass("off");
        }
	});
	
	// slick
	$('.slide_box.ty01').slick({		
		slidesToShow : 1,		
		slidesToScroll : 1,	
		//speed : 400,	
		arrows : false, 	
		dots :true, 	
		autoplay : false,		
		autoplaySpeed : 6000, 
		dotsClass : "slick-dots", 	//아래 나오는 페이지네이션(점) css class 지정	

	});

	// slick
	$('.list_slide_box').slick({		
		slidesToShow : 1,		
		slidesToScroll : 1,		
		arrows : true, 
		prevArrow: $('.prev'),
		nextArrow: $('.next'),
		dots :false, 	
		autoplay : false,		
		autoplaySpeed : 6000, 
		
	});
		
	
	
});

