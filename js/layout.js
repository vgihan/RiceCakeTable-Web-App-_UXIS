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
		shareRequest();
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
		if(shareSwitch) {
			if(socket.id === shareSocketId) {
				document.getElementsByClassName('chat1_1_cc')[0].style = "display: none;";
				return;
			}
			document.getElementsByClassName('view_lbox')[0].style = "display: none;";
			document.getElementsByClassName('view_all')[0].style = "display: none;";
			console.log('meeting display');
		}
		document.getElementsByClassName('inner')[0].style = "display: block;";
	});

	$('.header .r_hcont .second .h_btn.share').click(function(event) {
		var self = $(this);	
		if (self.hasClass("off")) {
			$('.header .r_hcont .second .h_btn.p_people').removeClass("on").addClass("off");
			self.removeClass("off").addClass("on");
		}
		if(shareSwitch) {
			if(socket.id === shareSocketId) {
				document.getElementsByClassName('chat1_1_cc')[0].style = "display: block;";
				return;
			}
			document.getElementsByClassName('view_lbox')[0].style = "display: block;";
			document.getElementsByClassName('view_all')[0].style = "display: block;";
			console.log('share display');
		}
		document.getElementsByClassName('inner')[0].style = "display: none;";
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

