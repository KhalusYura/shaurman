var App = {
    init: function() {
        window.sr = new scrollReveal();
        window.scrolled = null;

        this.initCarousels();
        this.initCartPopovers();
        this.initCartReloadEvent();
        this.initSwipe();
        this.validateForms();
        this.handleScrollToCatalog();
        this.handleSidebarToggle();
        this.handleCartToggle();
        this.handleIngridientsChoose();
        this.handleProductQuantityChange();
        this.handlePagination();
        this.handleProductDelete();
        this.handleFastOrder();
        this.handleBackToTopButton();
        this.handleProductDescriptionToggle();
        this.setTotalPriceInFastOrderModal();
    },

    initCarousels: function() {
        $('[data-carousel]').each(function() {
            var $self = $(this);
            var opts = $self.data('carousel');

            $self.owlCarousel(settings[opts]);
        });
    },

    initCartPopovers: function() {
        $('.cart-carousel__slide-title').each(function() {
            var $self = $(this);
            var html = $( $self.data('content-selector') ).html();

            $self
                .popover({
                    content: html,
                    html: true,
                    trigger: 'click',
                    // delay: {show: "0", hide: "500"},
                    container: '.cart__container',
                    placement: 'auto'
                });
                // .tooltip({
                //     container: '.cart__container',
                //     trigger: 'hover',
                //     placement: 'bottom'
                // });
        });

        $('body').on('click', function (e) {
            $('.cart-carousel__slide-title').each(function () {
                //the 'is' for buttons that trigger popups
                //the 'has' for icons within a button that triggers a popup
                if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                    $(this).popover('hide');
                }
            });
        });
    },

    initCartReloadEvent: function() {
        var self = this;

        $('.cart__wrapper').on('cart.reload', function(e, topMenuText) {
            var json_total_split = topMenuText.split(' ');
            var cart_total = json_total_split[2];
            // Ваш заказ № грн
            $('.top-menu__cart-info-your-order-value').text( json_total_split[3].replace('(', '') + ' ' + json_total_split[4].replace(')', ''));
            // Блюд к заказу №
            $('.top-menu__cart-info-orders-count-value').text( json_total_split[1] );

            $('.top-menu__cart-info-orders-count-outer').removeClass('empty');

            $(this).load('index.php?route=common/cart/info', function() {
                $('#cart-carousel').owlCarousel(settings.cart);

                self.initCartPopovers();

                if(!$('.cart-carousel__slide').length) {
                    $('.top-menu__cart-info-orders-count-outer').addClass('empty');
                    $('.page').removeClass('cart-shown');
                }
            });
        });
    },

    initSwipe: function() {
        $('.swipe-area').swipe({
            swipeRight: function() {
                $('.sidebar-toggle').trigger('click');
            }
        });

        $('.sidebar').swipe({
            swipeLeft: function() {
                $('.sidebar-toggle').trigger('click');
            }
        });
    },

    validateForms: function() {
        $('form').each(function() {
            $(this).validate({
                ignore: "",

                submitHandler: function(form) {
                    $(form).trigger('form.valid');
					
					if($(form).hasClass('submit-call-order')) {	
						var form_data = $(form).serialize();

						$.ajax({
							type: "POST",
							url: "mail.php",
							data: form_data,
							success: function(respond) {
								$('.submit-call-order .modal-body__content').html('<span class="form__text">Спасибо за заявку. В ближайшее время мы свяжемся с вами.</span>');
							    fbq('track', 'Contact');
                            }
						});
					}
                }
            });
        });
		
/* 			$('.submit-call-order').validate({
            debug: true,
            rules: {
                name: {
                    required: true,
                },
                tel: {
                    required: true,
                    number: true,
                    minlength: 5
                },
            },
            messages: {
                tel: {
                    required: "We need your phone number to contact you",
                    email: "Your phone number must be contains only numbers"
                }
            },
            submitHandler: function(form) {
                var form_data = $(form).serialize();
                console.log(form_data);

                $.ajax({
                    type: "POST",
                    url: "send-mail.php",
                    data: form_data,
                    success: function(respond) {
                        openPopUp('success');
                        console.log(form_data);
                    }
                });
            }
        }); */
    },

    handleProductQuantityChange: function() {
        $(document.body).on('click', '.product-quantity__control', function(e) {
            e.preventDefault();

            var $self = $(this);
            var modificator = parseInt($self.data('modificator'), 10);
            var $input = $self.parent().find('input');
            var currentVal = parseInt($input.val(), 10);
            var newVal = currentVal + modificator;

            if(newVal < 1) return;

            $input.val( newVal );

            if($self.hasClass('cart-edit-quantity')) {
                cart.update( $self.data('cart-key'), newVal );
            }
        });
    },

    handlePagination: function() {
        $('.load-more-items__button').on('click', function(e) {
            e.preventDefault();

            var $pagination = $('.pagination');
            var $next_page_link = $pagination.find('.active').next('li').find('a');
            var $self = $(this);
            var old_button_text = $self.find('span').text();
            var single_selector = $self.data('single-selector');
            var all_selector = $self.data('all-selector');

            $self.find('span').text('Загрузка...');

            if($next_page_link.length) {
                var next_page_url = $next_page_link.attr('href');

                $.ajax(next_page_url).done(function(res) {
                    var $res_html = $(res);

                    $(all_selector).append( $res_html.find(single_selector) );
                    $('.pagination').html( $res_html.find('.pagination').html() );

                    $self.find('span').text(old_button_text);
                });
            }

            else {
                $('.load-more-items').fadeOut('fast');
            }
        });
    },

    priceBeforeChangeRadio: [],

    recalCulateProductPrice: function($input) {
        var ingridient_price = $input.data('price');
        var $product_price = $('.single-product__price-value');
        var cur_price = $product_price.first().text().split(' ')[0];
        var cur_price_currency = $product_price.first().text().split(' ')[1];
        var new_price = 0;
        var id = '';
        var modificator = 0;

        if($input.attr('type') === 'radio') {
            id = $input.attr('name').replace(/[\[\]']+/g, '');

            if(!this.priceBeforeChangeRadio[id]) {
                this.priceBeforeChangeRadio[id] = cur_price;
            }

            if(!ingridient_price && $input.parent().parent().find('input[data-price!=""]').length) {
                new_price =  +this.priceBeforeChangeRadio[id] + ' ' + cur_price_currency;
            }

            else {
                new_price = (+cur_price + +ingridient_price) + ' ' + cur_price_currency;
            }

            return $product_price.text(new_price);
        }

        if($input.hasClass('display-only')) {
            modificator = +ingridient_price;
        }

        else {
            modificator = -ingridient_price;
        }

        new_price = (+cur_price + modificator) + ' ' + cur_price_currency;

        for(var i in this.priceBeforeChangeRadio) {
            this.priceBeforeChangeRadio[i] = +this.priceBeforeChangeRadio[i] + modificator;
        }

        $product_price.text(new_price);
    },

    handleIngridientsChoose: function() {
        var self = this;

        $('.product-ingridients__input').on('change', function(e) {
            var $self = $(this);
            var $checked_input = $( '#' + $self.attr('id') + '_checked' );
            var $display_input = $( '#' + $self.attr('id').split('_checked')[0] );

            if($self.hasClass('display-only')) {
                $checked_input.prop('checked', true);
            }

            else {
                $checked_input.prop('checked', false);

                // Check if option was checked in admin area
                if(!$self.data('checked')) {
                    $display_input.prop('checked', false);
                }
            }

            self.recalCulateProductPrice($self);
        });

        $('.product-sauces__input').on('change', function() {
            var $self = $(this);

            self.recalCulateProductPrice($self);
        });
    },

    handleScrollToCatalog: function() {
        $('.scroll-to-catalog').on('click', function(e) {
            e.preventDefault();


            $('html, body').animate({ scrollTop: $('#content').offset().top }, 'slow');
        });
    },

    handleSidebarToggle: function() {
        $('.sidebar-toggle').on('click', function(e) {
            var scrolled = $(window).scrollTop();

            $('.page').toggleClass('sidebar-shown-mobile');

            if($('.page').hasClass('sidebar-shown-mobile')) {
                $('.swipe-area').hide();
            }

            else {
                $('.swipe-area').show();
            }

            if(!window.scrolled) {
                window.scrolled = $(window).scrollTop();

                $('html, body').animate({ scrollTop: 0 }, 'slow');
            }

            else {
                $('html, body').animate({ scrollTop: window.scrolled }, 'slow');

                window.scrolled = null;
            }
        });
    },

    handleCartToggle: function() {
        $('.top-menu__cart-info-orders-count-outer').on('click', function(e) {
            if($(this).hasClass('empty')) return;

            $('.page').toggleClass('cart-shown');

            $('#cart-carousel').owlCarousel(settings.cart);
        });
    },

    handleProductDelete: function() {
        $(document.body).on('click', '.product-delete', function(e) {
            e.preventDefault();

            cart.remove( $(this).data('cart-key') );
        });
    },

    handleFastOrder: function() {
        var self = this;

        $('.submit-fast-order').on('form.valid', function(form) {
            var $self = $(this);
            var data = Utils.formSerializeObject($self.serializeArray());

            $self.find('button[type="submit"]').text('Загрузка...');

            self._saveFastOrderData(data);
        });
    },

    handleBackToTopButton: function() {
        if($(document.body).height() <= 1200) {
            $('.sidebar__button-up').hide();
        }

        $('.sidebar__button-up').on('click', function(e) {
            e.preventDefault();

            $('html, body').animate({ scrollTop: 0 }, 'slow');
        });
    },

    handleProductDescriptionToggle: function() {
        $('.single-product__toggle-description').on('click', function(e) {
            e.preventDefault();

            var $self = $(this);
            var button_text = $self.find('span').text().toLowerCase();

            $('.single-product__description').toggleClass('single-product__description--expanded');
            $self.find('span').text( (button_text === 'развернуть') ? 'свернуть' : 'развернуть' );
        });
    },

    setTotalPriceInFastOrderModal: function() {
        $('#courier_order_modal').on('show.bs.modal', function(e) {
            var $button = $(e.relatedTarget);

            $('.modal-body__content .single-product__price-value').text( $('.cart__info-price').text() );

            $('.modal-body__content').find('input[name="payment_method"]').val( $button.data('payment-method') );
        });
    },

    animateCart: function() {
        $('.top-menu__cart-info-orders-count-outer').addClass('animate');

        setTimeout(function() {
            $('.top-menu__cart-info-orders-count-outer').removeClass('animate');
        }, 2000);
    },

    _saveFastOrderData: function(data) {
        data = $.extend(true, {}, {
            name: '0',
            comment: '0'
        }, data);

        //fbq('track', 'AddPaymentInfo');

        $.ajax({
            url: 'index.php?route=checkout/guest/save',
            type: 'post',
            // Guest info
            data: 'firstname=' + data.name + '&lastname=-&email=no@mail.ua&telephone=' + data.phone + '&address_1=' + data.address + '&address_2=-&city=Odessa&country_id=220&zone_id=3495&fax=12121&company=-&postcode=4809&shipping_address=1',
            dataType: 'json',
            success: function(json) {
                // Set shipping methods session data
                $.ajax({
                    url: 'index.php?route=checkout/shipping_method',
                    dataType: 'html',
                    success: function(html) {
                        // Save shipping method
                        $.ajax({
                            url: 'index.php?route=checkout/shipping_method/save',
                            type: 'post',
                            data: 'shipping_method=free.free&comment=' + data.comment,
                            dataType: 'json',
                            success: function(json) {
                                // Set payment methods session data
                                $.ajax({
                                    url: 'index.php?route=checkout/payment_method',
                                    dataType: 'html',
                                    success: function(json) {
                                        // Save payment method
                                        $.ajax({
                                            url: 'index.php?route=checkout/payment_method/save',
                                            type: 'post',
                                            data: 'payment_method=' + data.payment_method + '&comment=' + data.comment + '&address_1=' + data.address,
                                            dataType: 'json',
                                            success: function(json) {
                                                // Confirm order
                                                $.ajax({
                                                    url: 'index.php?route=checkout/confirm',
                                                    dataType: 'html',
                                                    success: function(html) {
                                                        // fbq('track', 'Purchase', {value: '1.00', currency: 'USD'});
                                                        //fbq('track', 'Purchase');

                                                        $('#confirm_fast_order').append(html);
                                                        $('.buttons .btn-primary, .buttons input[type="submit"]').trigger('click');
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    },
};

var Utils = {
    updateCartText: function(json_total, reloadCart) {
        reloadCart = reloadCart || true;

        if(reloadCart) {
            $('.cart__wrapper').trigger('cart.reload', json_total);
        }
    },

    formSerializeObject: function(formSerializedArray) {
        var data = {};

        for(var i = 0; i < formSerializedArray.length; i++) {
            data[formSerializedArray[i].name] = formSerializedArray[i].value;
        }

        return data;
    }
};
