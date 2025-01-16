jQuery(document).ready(function($) {
    var currentPage = 0;
    var posts = [];
    var postCache = {};
    var currentPostIds = [];
    var preloadDistance = offcanvas_params.preload_distance || 2;
    var isFlipping = false;

    function loadPostContent(postId, callback) {
        if (!postId) {
            console.error('Invalid post ID');
            return;
        }

        if (postCache[postId]) {
            callback(postCache[postId]);
            return;
        }

        console.log('Loading post:', postId);
        
        $.ajax({
            url: offcanvas_params.rest_url + '/' + postId,
            type: 'GET',
            success: function(response) {
                console.log('Response for post ' + postId + ':', response);
                
                // Check if response is a string or has content property
                var content = typeof response === 'string' ? response : response.content;
                
                if (content) {
                    postCache[postId] = content;
                    callback(content);
                } else {
                    console.error('Invalid response format for post ' + postId);
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load content for post ' + postId + ':', error);
                console.log('XHR:', xhr.responseText);
            }
        });
    }

    function preloadPosts(currentIndex) {
        if (!currentPostIds.length) return;

        var start = Math.max(0, currentIndex - preloadDistance);
        var end = Math.min(currentPostIds.length - 1, currentIndex + preloadDistance);

        for (var i = start; i <= end; i++) {
            if (i !== currentIndex && !postCache[currentPostIds[i]]) {
                loadPostContent(currentPostIds[i], function(){});
            }
        }
    }

    function showPage(index) {
        if (index < 0 || index >= currentPostIds.length || isFlipping) return;
        
        var postId = currentPostIds[index];
        console.log('Showing page:', index, 'Post ID:', postId);
        
        loadPostContent(postId, function(content) {
            updatePageContent(content, index);
        });
    }

    function updatePageContent(content, newIndex) {
        if (!content || isFlipping) {
            console.error('No content to update or flip in progress');
            return;
        }

        console.log('Updating content for page:', newIndex);
        isFlipping = true;
        
        var contentArea = $('#offcanvas-content-area');
        var pageflip = $('.pageflip');
        var pageFront = $('#page-front');
        var pageBack = $('#page-back');
        
        if (!pageFront.length || !pageBack.length) {
            contentArea.html('<div class="pageflip"><div id="page-front"></div><div id="page-back"></div></div>');
            pageFront = $('#page-front');
            pageBack = $('#page-back');
            pageflip = $('.pageflip');
        }

        // Prepare the flip
        pageflip.addClass('preparing');
        
        if (pageflip.hasClass('flipped')) {
            // Current content is in back, new content goes to front
            pageFront.html(content);
            pageBack.empty();
        } else {
            // Current content is in front, new content goes to back
            pageBack.html(content);
            pageFront.empty();
        }

        // Trigger the flip after a brief delay to ensure content is loaded
        setTimeout(function() {
            pageflip.removeClass('preparing').toggleClass('flipped');
            
            // Wait for transition to complete
            pageflip.one('transitionend', function() {
                currentPage = newIndex;
                isFlipping = false;
                preloadPosts(currentPage);
                updateNavigationButtons();
            });
        }, 50);
    }

    function updateNavigationButtons() {
        $('#prev-page').toggleClass('disabled', currentPage <= 0);
        $('#next-page').toggleClass('disabled', currentPage >= currentPostIds.length - 1);
    }

    // Initialize pageflip when triggered by offcanvas.js
    $(document).on('offcanvas:init', function(e, postIds) {
        console.log('Initializing with post IDs:', postIds);
        
        currentPostIds = postIds;
        posts = new Array(postIds.length);
        currentPage = 0;
        isFlipping = false;
        
        // Ensure the flip containers exist
        var contentArea = $('#offcanvas-content-area');
        if (!$('.pageflip').length) {
            contentArea.html('<div class="pageflip"><div id="page-front"></div><div id="page-back"></div></div>');
        }
        
        // Initialize with current content
        var initialContent = contentArea.find('#page-front').html();
        postCache[postIds[0]] = initialContent;
        
        // Start preloading other posts
        preloadPosts(0);
        
        // Show navigation if there are multiple posts
        updateNavigationButtons();
    });

    $('#next-page').on('click', function() {
        if (!$(this).hasClass('disabled') && !isFlipping && currentPage < currentPostIds.length - 1) {
            showPage(currentPage + 1);
        }
    });

    $('#prev-page').on('click', function() {
        if (!$(this).hasClass('disabled') && !isFlipping && currentPage > 0) {
            showPage(currentPage - 1);
        }
    });

    // Add keyboard navigation
    $(document).on('keydown', function(e) {
        if ($('#offcanvas-panel').hasClass('active')) {
            if (e.keyCode === 37) { // Left arrow
                $('#prev-page').trigger('click');
            } else if (e.keyCode === 39) { // Right arrow
                $('#next-page').trigger('click');
            } else if (e.keyCode === 27) { // Escape
                $('.close-panel').trigger('click');
            }
        }
    });
});