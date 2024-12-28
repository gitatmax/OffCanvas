jQuery(document).ready(function($) {
    var currentPage = 0;
    var posts = [];

    function loadPostContent(postId, callback) {
        $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'get_post_content',
                post_id: postId,
                nonce: ajax_object.nonce
            },
            success: function(response) {
                if (response.success) {
                    callback(response.data);
                }
            }
        });
    }

    function showPage(index) {
        if (index < 0 || index >= posts.length) return;
        currentPage = index;
        var content = posts[currentPage];
        var pageflip = $('.pageflip');
        if (pageflip.hasClass('flip')) {
            $('#page-front').html(content);
        } else {
            $('#page-back').html(content);
        }
        pageflip.toggleClass('flip');
    }

    $('.offcanvas-trigger').on('click', function(e) {
        e.preventDefault();
        var postIds = $(this).data('post-ids');
        if (!postIds) {
            console.error('No post IDs defined');
            return;
        }
        postIds = postIds.split(',');
        posts = [];
        currentPage = 0;

        postIds.forEach(function(postId, index) {
            loadPostContent(postId, function(content) {
                posts[index] = content;
                if (index === 0) {
                    showPage(0);
                    $('#offcanvas-panel').addClass('active');
                }
            });
        });
    });

    $('.close-panel').on('click', function() {
        $('#offcanvas-panel').removeClass('active');
    });

    $('#next-page').on('click', function() {
        if (currentPage < posts.length - 1) {
            currentPage++;
            showPage(currentPage);
        }
    });

    $('#prev-page').on('click', function() {
        if (currentPage > 0) {
            currentPage--;
            showPage(currentPage);
        }
    });
});