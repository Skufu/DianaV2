#!/usr/bin/env python3
"""
Diana V2 Demo Video Production Script
Automates video creation workflow using FFmpeg

Usage:
    python3 produce_video.py --help
    python3 produce_video.py create-title --output title.mp4
    python3 produce_video.py stitch --inputs scene1.mp4 scene2.mp4 --output final.mp4
"""

import argparse
import subprocess
import json
from pathlib import Path

# Configuration
PROJECT_ROOT = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2")
DEMO_VIDEO_DIR = PROJECT_ROOT / "demo-video"
OUTPUT_DIR = DEMO_VIDEO_DIR / "output"
ASSETS_DIR = DEMO_VIDEO_DIR / "assets"

# Style Configuration
STYLE = {
    "resolution": "1920x1080",
    "fps": 30,
    "bitrate": "15M",
    "colors": {
        "primary": "#3B82F6",      # Blue
        "secondary": "#10B981",    # Green
        "accent": "#F59E0B",       # Amber
        "danger": "#EF4444",       # Red
        "background": "#0F172A",   # Dark slate
        "text": "#F8FAFC",         # White
    },
    "fonts": {
        "title": "Inter-Bold",
        "body": "Inter-Regular",
    }
}

def run_ffmpeg(cmd, description="FFmpeg operation"):
    """Run FFmpeg command with error handling"""
    print(f"\n🎬 {description}...")
    print(f"Command: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return False
    
    print(f"✅ {description} complete")
    return True

def create_gradient_background(output_path, duration=5, color_start="#0F172A", color_end="#1E293B"):
    """Create animated gradient background"""
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={color_start}:s={STYLE['resolution']}:d={duration}",
        "-vf", f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "fast",
        str(output_path)
    ]
    return run_ffmpeg(cmd, f"Creating gradient background ({duration}s)")

def create_title_card(output_path, title="Diana V2", subtitle="Predictive Diabetes Risk Assessment", 
                      tagline="For Menopausal Women", duration=5):
    """Create animated title card with text overlays"""
    
    # Create filter complex for title animation
    filter_complex = f"""
    color=c={STYLE['colors']['background']}:s={STYLE['resolution']}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{title}':
    fontcolor={STYLE['colors']['primary']}:
    fontsize=96:
    x=(w-text_w)/2:
    y=(h-text_h)/2-50:
    alpha='if(lt(t,0.5),t*2,if(lt(t,{duration}-0.5),1,({duration}-t)*2))'[txt1];
    
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{subtitle}':
    fontcolor={STYLE['colors']['text']}:
    fontsize=48:
    x=(w-text_w)/2:
    y=(h-text_h)/2+60:
    alpha='if(lt(t,0.8),(t-0.3)*2,if(lt(t,{duration}-0.5),1,({duration}-t)*2))'[txt2];
    
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{tagline}':
    fontcolor={STYLE['colors']['secondary']}:
    fontsize=32:
    x=(w-text_w)/2:
    y=(h-text_h)/2+120:
    alpha='if(lt(t,1.0),(t-0.5)*2,if(lt(t,{duration}-0.5),1,({duration}-t)*2))'
    """
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={STYLE['colors']['background']}:s={STYLE['resolution']}:d={duration}",
        "-filter_complex", filter_complex.replace('\n', ''),
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        str(output_path)
    ]
    
    return run_ffmpeg(cmd, f"Creating title card: {title}")

def add_captions_to_video(input_path, output_path, captions):
    """
    Add caption overlays to video
    captions: list of dicts with 'text', 'start', 'duration', 'position'
    """
    # Build drawtext filters for each caption
    filters = []
    for i, cap in enumerate(captions):
        start = cap.get('start', 0)
        duration = cap.get('duration', 3)
        text = cap.get('text', '')
        position = cap.get('position', 'bottom')
        
        # Calculate y position
        if position == 'bottom':
            y_pos = "h-text_h-50"
        elif position == 'top':
            y_pos = "50"
        else:  # center
            y_pos = "(h-text_h)/2"
        
        # Create fade in/out alpha
        fade_in = 0.3
        fade_out = 0.3
        alpha_expr = f"if(lt(t,{start+fade_in}),(t-{start})/{fade_in},if(lt(t,{start+duration-fade_out}),1,({start+duration}-t)/{fade_out}))"
        
        filter_str = f"drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='{text}':fontcolor={STYLE['colors']['text']}:fontsize=36:x=(w-text_w)/2:y={y_pos}:alpha='{alpha_expr}':enable='between(t\\,{start}\\,{start+duration})'"
        filters.append(filter_str)
    
    filter_complex = ','.join(filters)
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-filter_complex", filter_complex,
        "-c:a", "copy",
        "-c:v", "libx264",
        "-preset", "fast",
        str(output_path)
    ]
    
    return run_ffmpeg(cmd, f"Adding captions to {input_path.name}")

def stitch_videos(input_paths, output_path, transition_duration=0.5):
    """Stitch multiple videos together with fade transitions"""
    
    if len(input_paths) < 2:
        print("Need at least 2 videos to stitch")
        return False
    
    # Create concat file list
    concat_file = OUTPUT_DIR / "concat_list.txt"
    with open(concat_file, 'w') as f:
        for path in input_paths:
            f.write(f"file '{path.absolute()}'\n")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        str(output_path)
    ]
    
    success = run_ffmpeg(cmd, f"Stitching {len(input_paths)} videos")
    
    # Cleanup
    concat_file.unlink(missing_ok=True)
    
    return success

def create_info_graphic(output_path, title, bullet_points, duration=5):
    """Create info graphic scene with bullet points"""
    
    # Build text overlay for bullet points
    text_lines = '\\\\n'.join([f"• {point}" for point in bullet_points])
    
    filter_complex = f"""
    color=c={STYLE['colors']['background']}:s={STYLE['resolution']}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{title}':
    fontcolor={STYLE['colors']['primary']}:
    fontsize=64:
    x=(w-text_w)/2:
    y=100:
    alpha='if(lt(t,0.5),t*2,1)'[title];
    
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{text_lines}':
    fontcolor={STYLE['colors']['text']}:
    fontsize=36:
    x=200:
    y=250:
    alpha='if(lt(t,0.8),(t-0.3)*2,1)'
    """
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={STYLE['colors']['background']}:s={STYLE['resolution']}:d={duration}",
        "-filter_complex", filter_complex.replace('\n', ''),
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "fast",
        str(output_path)
    ]
    
    return run_ffmpeg(cmd, f"Creating info graphic: {title}")

def create_closing_card(output_path, project_name="Diana V2", highlights=None, duration=7):
    """Create closing card with highlights and links"""
    
    if highlights is None:
        highlights = [
            "Full-stack Go + React + Python application",
            "Machine learning with explainable AI",
            "Production-ready with auth, audit, monitoring"
        ]
    
    highlights_text = '\\\\n'.join([f"✓ {h}" for h in highlights])
    
    filter_complex = f"""
    color=c={STYLE['colors']['background']}:s={STYLE['resolution']}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{project_name}':
    fontcolor={STYLE['colors']['primary']}:
    fontsize=72:
    x=(w-text_w)/2:
    y=150:
    alpha='if(lt(t,0.5),t*2,1)'[title];
    
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{highlights_text}':
    fontcolor={STYLE['colors']['text']}:
    fontsize=32:
    x=(w-text_w)/2:
    y=300:
    alpha='if(lt(t,0.8),(t-0.3)*2,1)'[highlights];
    
    [highlights]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='Built by Adrian Francisco | 2026':
    fontcolor={STYLE['colors']['secondary']}:
    fontsize=24:
    x=(w-text_w)/2:
    y=h-100:
    alpha='if(lt(t,1.0),(t-0.5)*2,1)'
    """
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={STYLE['colors']['background']}:s={STYLE['resolution']}:d={duration}",
        "-filter_complex", filter_complex.replace('\n', ''),
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "fast",
        str(output_path)
    ]
    
    return run_ffmpeg(cmd, f"Creating closing card")

def generate_thumbnail(output_path, title="Diana V2", subtitle="ML-Powered Diabetes Risk Assessment"):
    """Generate video thumbnail"""
    
    filter_complex = f"""
    color=c={STYLE['colors']['background']}:s=1280x720[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{title}':
    fontcolor={STYLE['colors']['primary']}:
    fontsize=96:
    x=(w-text_w)/2:
    y=(h-text_h)/2-30[title];
    
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='{subtitle}':
    fontcolor={STYLE['colors']['text']}:
    fontsize=36:
    x=(w-text_w)/2:
    y=(h-text_h)/2+60
    """
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={STYLE['colors']['background']}:s=1280x720:d=1",
        "-filter_complex", filter_complex.replace('\n', ''),
        "-vframes", "1",
        str(output_path)
    ]
    
    return run_ffmpeg(cmd, f"Generating thumbnail")

def main():
    parser = argparse.ArgumentParser(description="Diana V2 Demo Video Production")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Create directories
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create title command
    title_parser = subparsers.add_parser('create-title', help='Create title card')
    title_parser.add_argument('--output', default=str(OUTPUT_DIR / '01_title.mp4'))
    title_parser.add_argument('--title', default='Diana V2')
    title_parser.add_argument('--subtitle', default='Predictive Diabetes Risk Assessment')
    title_parser.add_argument('--duration', type=int, default=5)
    
    # Create info graphic command
    info_parser = subparsers.add_parser('create-info', help='Create info graphic')
    info_parser.add_argument('--output', required=True)
    info_parser.add_argument('--title', required=True)
    info_parser.add_argument('--points', nargs='+', required=True)
    info_parser.add_argument('--duration', type=int, default=5)
    
    # Create closing command
    closing_parser = subparsers.add_parser('create-closing', help='Create closing card')
    closing_parser.add_argument('--output', default=str(OUTPUT_DIR / '09_closing.mp4'))
    closing_parser.add_argument('--duration', type=int, default=7)
    
    # Add captions command
    captions_parser = subparsers.add_parser('add-captions', help='Add captions to video')
    captions_parser.add_argument('--input', required=True)
    captions_parser.add_argument('--output', required=True)
    captions_parser.add_argument('--captions-json', required=True)
    
    # Stitch command
    stitch_parser = subparsers.add_parser('stitch', help='Stitch videos together')
    stitch_parser.add_argument('--inputs', nargs='+', required=True)
    stitch_parser.add_argument('--output', required=True)
    
    # Thumbnail command
    thumb_parser = subparsers.add_parser('thumbnail', help='Generate thumbnail')
    thumb_parser.add_argument('--output', default=str(OUTPUT_DIR / 'thumbnail.jpg'))
    
    # Full production command
    _ = subparsers.add_parser('full-production', help='Run full production pipeline')
    
    args = parser.parse_args()
    
    if args.command == 'create-title':
        create_title_card(args.output, args.title, duration=args.duration)
    
    elif args.command == 'create-info':
        create_info_graphic(args.output, args.title, args.points, args.duration)
    
    elif args.command == 'create-closing':
        create_closing_card(args.output, duration=args.duration)
    
    elif args.command == 'add-captions':
        with open(args.captions_json) as f:
            captions = json.load(f)
        add_captions_to_video(args.input, args.output, captions)
    
    elif args.command == 'stitch':
        stitch_videos(args.inputs, args.output)
    
    elif args.command == 'thumbnail':
        generate_thumbnail(args.output)
    
    elif args.command == 'full-production':
        print("🎬 Starting full production pipeline...")
        print("=" * 60)
        
        # Scene 1: Title
        create_title_card(
            OUTPUT_DIR / "01_title.mp4",
            "Diana V2",
            "Predictive Diabetes Risk Assessment",
            "For Menopausal Women",
            duration=5
        )
        
        # Scene 2: Problem Statement
        create_info_graphic(
            OUTPUT_DIR / "02_problem.mp4",
            "The Challenge",
            [
                "Traditional screening misses early warning signs",
                "Menopausal women face unique metabolic risks", 
                "1 in 4 women affected by diabetes",
                "Early detection saves lives"
            ],
            duration=6
        )
        
        # Scene 9: Closing
        create_closing_card(
            OUTPUT_DIR / "09_closing.mp4",
            "Diana V2",
            [
                "Full-stack Go + React + Python application",
                "Machine learning with explainable AI",
                "Production-ready with auth, audit, monitoring",
                "Ready for clinical deployment"
            ],
            duration=8
        )
        
        # Generate thumbnail
        generate_thumbnail(OUTPUT_DIR / "thumbnail.jpg")
        
        print("\n" + "=" * 60)
        print("✅ Production complete!")
        print(f"📁 Output directory: {OUTPUT_DIR}")
        print("\nGenerated files:")
        for f in OUTPUT_DIR.iterdir():
            print(f"  - {f.name}")
        
        print("\n📝 Next steps:")
        print("  1. Record screen capture segments (scenes 3-8)")
        print("  2. Place recorded files in output/ directory")
        print("  3. Run: python3 produce_video.py stitch --inputs output/*.mp4 --output final.mp4")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
