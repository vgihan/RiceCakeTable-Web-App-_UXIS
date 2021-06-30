$(function(){

	// menu 
	$('.menuicon').click(function(event) {
		$('.menu').fadeIn();			
	});
	
	$('.cancelicon').click(function(event) {
		$('.menu').fadeOut();
	});

	$('#share').click(function(event) {
		$('.menu').fadeOut();
		$('.header .r_hcont .second .h_btn.p_people').removeClass('on').addClass('off');
		$('.header .r_hcont .second .h_btn.share').removeClass('off').addClass('on');
		shareStart();
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

	$('.header .r_hcont .second .h_btn.p_people').click(function(event) {
		var self = $(this);	
		if (self.hasClass("off")) {
			$('.header .r_hcont .second .h_btn.share').removeClass("on").addClass("off");
			self.removeClass("off").addClass("on");
		}
	});

	$('.header .r_hcont .second .h_btn.share').click(function(event) {
		var self = $(this);	
		if (self.hasClass("off")) {
			$('.header .r_hcont .second .h_btn.p_people').removeClass("on").addClass("off");
			self.removeClass("off").addClass("on");
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
		dotsClass : "slick-dots", 	//�Ʒ� ������ ���������̼�(��) css class ����	

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

