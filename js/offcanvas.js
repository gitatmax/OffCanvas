jQuery(document).ready(function($) {
    var buttonsCreated = false;
    var currentPostIndex = 0;
    var currentPostIds = [];

    // Create navigation buttons dynamically only when needed
    function createNavigationButtons() {
        console.log('Creating navigation buttons');
        if (buttonsCreated) {
            console.log('Buttons already created, skipping');
            return;
        }
        
        var container = $('#offcanvas-panel .offcanvas-content');
        console.log('Container found:', container.length > 0);
        
        if (!container.length) {
            console.error('Container not found');
            return;
        }
        
        // Create new buttons
        var prevButton = $('<button>', {
            id: 'prev-page',
            class: 'nav-button',
            'aria-label': 'Previous page',
            text: '←'
        });
        
        var nextButton = $('<button>', {
            id: 'next-page',
            class: 'nav-button',
            'aria-label': 'Next page',
            text: '→'
        });
        
        var closeButton = $('<button>', {
            class: 'close-panel',
            'aria-label': 'Close panel',
            text: '×',
            click: function(e) {
                console.log('Close button clicked directly');
                e.preventDefault();
                e.stopPropagation();
                closePanel();
                return false;
            }
        });
        
        // Append buttons to container
        container.append(prevButton);
        container.append(nextButton);
        container.append(closeButton);
        
        console.log('Buttons appended to container');
        console.log('Prev button exists:', $('#prev-page').length > 0);
        console.log('Next button exists:', $('#next-page').length > 0);
        console.log('Close button exists:', $('.close-panel').length > 0);
        
        // Add click handlers for navigation buttons
        prevButton.on('click', function(e) {
            console.log('Previous button clicked');
            e.preventDefault();
            e.stopPropagation();
            if (currentPostIndex > 0) {
                loadPost(currentPostIds[--currentPostIndex]);
            }
        });

        nextButton.on('click', function(e) {
            console.log('Next button clicked');
            e.preventDefault();
            e.stopPropagation();
            if (currentPostIndex < currentPostIds.length - 1) {
                loadPost(currentPostIds[++currentPostIndex]);
            }
        });
        
        buttonsCreated = true;
        updateNavigationState();
    }

    // Update navigation button states
    function updateNavigationState() {
        console.log('Updating navigation state, current index:', currentPostIndex);
        console.log('Total posts:', currentPostIds.length);
        $('#prev-page').toggleClass('disabled', currentPostIndex === 0);
        $('#next-page').toggleClass('disabled', currentPostIndex === currentPostIds.length - 1);
    }

    // Load post content
    function loadPost(postId) {
        console.log('Loading post:', postId);
        $.ajax({
            url: offcanvas_params.rest_url + '/' + postId,
            type: 'GET',
            success: function(response) {
                var content = typeof response === 'string' ? response : response.content;
                
                if (content) {
                    var pageflipHtml = '<div class="pageflip">' +
                        '<div id="page-front">' + content + '</div>' +
                        '<div id="page-back"></div>' +
                    '</div>';
                    
                    $('#offcanvas-content-area').html(pageflipHtml);
                    updateNavigationState();
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load content:', error);
            }
        });
    }

    // Clean up function to remove navigation elements
    function cleanupNavigationElements() {
        console.log('Cleaning up navigation elements');
        buttonsCreated = false;
        var container = $('#offcanvas-panel .offcanvas-content');
        container.find('.nav-button, .close-panel').remove();
        console.log('Cleanup complete');
    }

    // Add click handler to posts/pages
    $('.offcanvas-trigger').on('click', function(e) {
        console.log('Trigger clicked');
        e.preventDefault();
        e.stopPropagation();
        
        var postIds = $(this).data('post-ids');
        console.log('Post IDs:', postIds);
        
        if (!postIds) {
            console.error('No post IDs specified');
            return;
        }
        
        // Convert to array and validate
        currentPostIds = postIds.toString().split(',').map(function(id) {
            return parseInt(id, 10);
        }).filter(function(id) {
            return !isNaN(id);
        });

        console.log('Processed post IDs:', currentPostIds);
        console.log('Number of posts:', currentPostIds.length);

        if (currentPostIds.length === 0) {
            console.error('No valid post IDs found');
            return;
        }

        currentPostIndex = 0;

        // Load the first post
        $.ajax({
            url: offcanvas_params.rest_url + '/' + currentPostIds[currentPostIndex],
            type: 'GET',
            beforeSend: function() {
                console.log('Loading content, removing active class');
                $('#offcanvas-panel').removeClass('active');
                cleanupNavigationElements();
            },
            success: function(response) {
                console.log('Content loaded successfully');
                var content = typeof response === 'string' ? response : response.content;
                
                if (content) {
                    var contentArea = $('#offcanvas-content-area');
                    var pageflipHtml = '<div class="pageflip">' +
                        '<div id="page-front">' + content + '</div>' +
                        '<div id="page-back"></div>' +
                    '</div>';
                    
                    contentArea.html(pageflipHtml);
                    
                    // First add active class and prevent body scroll
                    $('#offcanvas-panel').addClass('active');
                    $('body').addClass('offcanvas-active');
                    
                    // Then create buttons if we have multiple posts
                    console.log('Number of posts for button creation:', currentPostIds.length);
                    if (currentPostIds.length > 1) {
                        console.log('Creating navigation buttons for multiple posts');
                        createNavigationButtons();
                    } else {
                        console.log('Single post, skipping button creation');
                    }
                } else {
                    console.error('Invalid response format');
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load content:', error);
            }
        });
    });

    // Close panel handler
    function closePanel() {
        console.log('Closing panel');
        var panel = $('#offcanvas-panel');
        panel.removeClass('active');
        
        setTimeout(function() {
            if (!panel.hasClass('active')) {
                cleanupNavigationElements();
                currentPostIndex = 0;
                currentPostIds = [];
                $('body').removeClass('offcanvas-active');
            }
        }, 300);
    }

    // Close panel click handler
    $(document).on('click', '#offcanvas-panel .close-panel', function(e) {
        console.log('Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        closePanel();
    });

    // Close panel when clicking outside
    $(document).on('click', function(e) {
        var panel = $("#offcanvas-panel");
        var target = $(e.target);
        
        // Don't close if clicking navigation buttons, close button, or their contents
        if (target.hasClass('nav-button') || 
            target.closest('.nav-button').length || 
            target.hasClass('close-panel') || 
            target.closest('.close-panel').length) {
            console.log('Click on button, not closing');
            return;
        }
        
        // Only close if panel is active and click is outside the content
        if (panel.hasClass('active') && 
            !target.closest('.offcanvas-content').length && 
            !target.hasClass('offcanvas-trigger') && 
            !target.closest('.offcanvas-trigger').length) {
            console.log('Click outside panel, closing');
            closePanel();
        }
    });

    // Prevent clicks inside panel from closing it
    $('#offcanvas-panel').on('click', '.offcanvas-content, .nav-button, .close-panel', function(e) {
        e.stopPropagation();
    });

    // Handle escape key
    $(document).on('keydown', function(e) {
        if (e.keyCode === 27 && $('#offcanvas-panel').hasClass('active')) {
            console.log('Escape key pressed, closing panel');
            closePanel();
        }
    });
});