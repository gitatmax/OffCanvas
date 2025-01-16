jQuery(document).ready(function($) {
    var buttonsCreated = false;
    var currentPostIndex = 0;
    var currentPostIds = [];

    // Create navigation buttons dynamically only when needed
    function createNavigationButtons() {
        if (buttonsCreated) return;
        
        var container = $('#offcanvas-panel .offcanvas-content');
        if (!container.length) return;
        
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
        
        // Add click handlers for navigation buttons
        prevButton.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (currentPostIndex > 0) {
                loadPost(currentPostIds[--currentPostIndex]);
            }
        });

        nextButton.on('click', function(e) {
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
        $('#prev-page').toggleClass('disabled', currentPostIndex === 0);
        $('#next-page').toggleClass('disabled', currentPostIndex === currentPostIds.length - 1);
    }

    // Load post content
    function loadPost(postId) {
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
        buttonsCreated = false;
        var container = $('#offcanvas-panel .offcanvas-content');
        container.find('.nav-button, .close-panel').remove();
    }

    // Add click handler to posts/pages
    $('.offcanvas-trigger').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var postIds = $(this).data('post-ids');
        if (!postIds) return;
        
        // Convert to array and validate
        currentPostIds = postIds.toString().split(',').map(function(id) {
            return parseInt(id, 10);
        }).filter(function(id) {
            return !isNaN(id);
        });

        if (currentPostIds.length === 0) return;

        currentPostIndex = 0;

        // Load the first post
        $.ajax({
            url: offcanvas_params.rest_url + '/' + currentPostIds[currentPostIndex],
            type: 'GET',
            beforeSend: function() {
                $('#offcanvas-panel').removeClass('active');
                cleanupNavigationElements();
            },
            success: function(response) {
                var content = typeof response === 'string' ? response : response.content;
                
                if (content) {
                    var contentArea = $('#offcanvas-content-area');
                    var pageflipHtml = '<div class="pageflip">' +
                        '<div id="page-front">' + content + '</div>' +
                        '<div id="page-back"></div>' +
                    '</div>';
                    
                    contentArea.html(pageflipHtml);
                    
                    // First add active class
                    $('#offcanvas-panel').addClass('active');
                    
                    // Then create buttons if we have multiple posts
                    if (currentPostIds.length > 1) {
                        createNavigationButtons();
                    }
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load content:', error);
            }
        });
    });

    // Close panel handler
    function closePanel() {
        var panel = $('#offcanvas-panel');
        panel.removeClass('active');
        
        setTimeout(function() {
            if (!panel.hasClass('active')) {
                cleanupNavigationElements();
                currentPostIndex = 0;
                currentPostIds = [];
            }
        }, 300);
    }

    // Close panel when clicking outside
    $(document).on('click', function(e) {
        var panel = $("#offcanvas-panel");
        var target = $(e.target);
        
        // Don't close if clicking navigation buttons, close button, or their contents
        if (target.hasClass('nav-button') || 
            target.closest('.nav-button').length || 
            target.hasClass('close-panel') || 
            target.closest('.close-panel').length) {
            return;
        }
        
        // Only close if panel is active and click is outside the content
        if (panel.hasClass('active') && 
            !target.closest('.offcanvas-content').length && 
            !target.hasClass('offcanvas-trigger') && 
            !target.closest('.offcanvas-trigger').length) {
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
            closePanel();
        }
    });
});