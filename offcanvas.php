<?php
/*
Plugin Name: OffCanvas
Description: Displays post/page content in a sliding panel with advanced animations and performance optimizations
Version: 1.3
Author: Maxwell White
Author URI: https://maxehmum.com
*/

// If this file is called directly, abort.
if (!defined('ABSPATH')) {
    die('Direct access is not allowed.');
}

// Define plugin constants
define('OFFCANVAS_VERSION', '1.3');
define('OFFCANVAS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('OFFCANVAS_PLUGIN_URL', plugin_dir_url(__FILE__));

// Register activation hook
register_activation_hook(__FILE__, 'offcanvas_activate');

function offcanvas_activate() {
    // Set default options
    $default_options = array(
        'animation_speed' => 400,
        'preload_distance' => 2,
        'cache_expiry' => 3600,
        'mobile_breakpoint' => 768
    );
    
    add_option('offcanvas_options', $default_options);
    
    // Clear any existing transients
    delete_transient('offcanvas_cache');
}

// Add shortcode for creating trigger links
function offcanvas_trigger_shortcode($atts) {
    $atts = shortcode_atts(array(
        'ids' => get_the_ID(), // Default to current post ID, can be comma-separated list
        'text' => 'Read More', // Default text
        'class' => '', // Additional classes
    ), $atts);

    // Convert IDs to array and validate
    $ids = array_map('trim', explode(',', $atts['ids']));
    $valid_ids = array_filter($ids, function($id) {
        return is_numeric($id) && get_post($id);
    });

    if (empty($valid_ids)) {
        return '';
    }

    return sprintf(
        '<a href="#" class="offcanvas-trigger %s" data-post-ids="%s">%s</a>',
        esc_attr($atts['class']),
        esc_attr(implode(',', $valid_ids)),
        esc_html($atts['text'])
    );
}
add_shortcode('offcanvas', 'offcanvas_trigger_shortcode');

// Filter to automatically add trigger to post excerpts
function offcanvas_add_trigger_to_excerpt($excerpt) {
    if (is_single() || is_page()) {
        return $excerpt;
    }
    
    $post_id = get_the_ID();
    $next_post = get_next_post();
    $prev_post = get_previous_post();
    
    $post_ids = array_filter([
        $prev_post ? $prev_post->ID : null,
        $post_id,
        $next_post ? $next_post->ID : null
    ]);
    
    $trigger = sprintf(
        '<p><a href="#" class="offcanvas-trigger" data-post-ids="%s">Read More</a></p>',
        esc_attr(implode(',', $post_ids))
    );
    
    return $excerpt . $trigger;
}
add_filter('the_excerpt', 'offcanvas_add_trigger_to_excerpt');

// Register REST API endpoint
add_action('rest_api_init', function () {
    register_rest_route('offcanvas/v1', '/content/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'get_post_content',
        'permission_callback' => '__return_true',
        'args' => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            )
        )
    ));
});

// Enqueue necessary scripts and styles
function offcanvas_content_scripts() {
    $options = get_option('offcanvas_options');
    
    wp_enqueue_script('jquery');
    
    // Register and enqueue main scripts with version for cache busting
    wp_register_script(
        'offcanvas-content', 
        OFFCANVAS_PLUGIN_URL . 'js/offcanvas.js',
        array('jquery'),
        OFFCANVAS_VERSION,
        true
    );
    
    wp_register_script(
        'pageflip-content',
        OFFCANVAS_PLUGIN_URL . 'js/pageflip.js',
        array('jquery'),
        OFFCANVAS_VERSION,
        true
    );
    
    // Register and enqueue styles
    wp_register_style(
        'offcanvas-styles',
        OFFCANVAS_PLUGIN_URL . 'css/offcanvas.css',
        array(),
        OFFCANVAS_VERSION
    );
    
    wp_register_style(
        'pageflip-styles',
        OFFCANVAS_PLUGIN_URL . 'css/pageflip.css',
        array(),
        OFFCANVAS_VERSION
    );
    
    // Enqueue all registered assets
    wp_enqueue_script('offcanvas-content');
    wp_enqueue_script('pageflip-content');
    wp_enqueue_style('offcanvas-styles');
    wp_enqueue_style('pageflip-styles');
    
    // Localize the script with new data
    wp_localize_script('offcanvas-content', 'offcanvas_params', array(
        'rest_url' => esc_url_raw(rest_url('offcanvas/v1/content')),
        'animation_speed' => $options['animation_speed'],
        'preload_distance' => $options['preload_distance'],
        'mobile_breakpoint' => $options['mobile_breakpoint']
    ));
}
add_action('wp_enqueue_scripts', 'offcanvas_content_scripts');

// Add offcanvas container to footer
function add_offcanvas_container() {
    echo '<div id="offcanvas-panel" role="dialog" aria-modal="true" aria-label="Content Panel">
            <div class="offcanvas-content">
                <div id="offcanvas-content-area" class="pageflip-container">
                    <div class="pageflip">
                        <div class="page front" id="page-front"></div>
                        <div class="page back" id="page-back"></div>
                    </div>
                </div>
            </div>
          </div>';
}
add_action('wp_footer', 'add_offcanvas_container');

// Content retrieval function
function get_post_content($request) {
    try {
        $post_id = $request['id'];
        
        // Check if post exists and is published
        $post = get_post($post_id);
        if (!$post || $post->post_status !== 'publish') {
            return new WP_Error(
                'post_not_found',
                'Post not found or not published',
                array('status' => 404)
            );
        }
        
        // For public posts, only check if the post type is public
        if (!is_user_logged_in()) {
            $post_type_obj = get_post_type_object($post->post_type);
            if (!$post_type_obj->public) {
                return new WP_Error(
                    'not_public',
                    'This content is not publicly accessible',
                    array('status' => 403)
                );
            }
        } else {
            // For logged-in users, check specific capabilities
            if (!current_user_can('read_post', $post_id)) {
                return new WP_Error(
                    'not_authorized',
                    'You do not have permission to view this content',
                    array('status' => 403)
                );
            }
        }
        
        // Try to get cached content
        $cache_key = 'offcanvas_post_' . $post_id;
        $cached_content = get_transient($cache_key);
        
        if ($cached_content !== false) {
            return array(
                'content' => $cached_content
            );
        }
        
        // Get fresh content if not cached
        $content = apply_filters('the_content', $post->post_content);
        
        // Cache the content
        $options = get_option('offcanvas_options');
        set_transient($cache_key, $content, $options['cache_expiry']);
        
        return array(
            'content' => $content
        );
        
    } catch (Exception $e) {
        return new WP_Error(
            'server_error',
            'An unexpected error occurred',
            array('status' => 500)
        );
    }
}

// Clear cache when post is updated
function clear_offcanvas_cache($post_id) {
    delete_transient('offcanvas_post_' . $post_id);
}
add_action('save_post', 'clear_offcanvas_cache');
add_action('deleted_post', 'clear_offcanvas_cache');

// Plugin cleanup on deactivation
function offcanvas_deactivate() {
    // Clear all plugin transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_offcanvas_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_offcanvas_%'");
    
    // Delete plugin options
    delete_option('offcanvas_options');
}