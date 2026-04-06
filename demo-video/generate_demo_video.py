#!/usr/bin/env python3
"""
Diana V2 Demo Video Generator
Creates a complete demo video using FFmpeg with all 9 scenes.
"""

import subprocess
from pathlib import Path

# Configuration
OUTPUT_DIR = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/output")
SCREENSHOTS_DIR = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/screen-recordings")
FINAL_OUTPUT = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/DianaV2_Demo_Video.mp4")

# Video settings
WIDTH = 1920
HEIGHT = 1080
FPS = 30

# Color scheme (matching Diana V2 branding)
DARK_BG = "#0F172A"      # Dark navy
BLUE = "#3B82F6"         # Primary blue
GREEN = "#10B981"        # Success green
YELLOW = "#F59E0B"       # Warning yellow
RED = "#EF4444"          # Danger red
WHITE = "#FFFFFF"
LIGHT_TEXT = "#94A3B8"

def run_ffmpeg(cmd, description):
    """Run FFmpeg command"""
    print(f"\n{'='*60}")
    print(f"Creating: {description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(f"✓ Created successfully")
    return True

def create_title_scene():
    """Scene 1: Title Card"""
    duration = 5
    output = OUTPUT_DIR / "01_title.mp4"
    
    # Create title with logo animation
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='DIANA V2':fontsize=120:fontcolor={BLUE}:
    x=(w-text_w)/2:y=(h-text_h)/2-80[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='Predictive Diabetes Risk Assessment':fontsize=48:fontcolor={WHITE}:
    x=(w-text_w)/2:y=(h-text_h)/2+40[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='For Menopausal Women':fontsize=36:fontcolor={LIGHT_TEXT}:
    x=(w-text_w)/2:y=(h-text_h)/2+100[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='Powered by Machine Learning':fontsize=28:fontcolor={GREEN}:
    x=(w-text_w)/2:y=(h-text_h)/2+180[txt4];
    [txt4]fade=t=out:st=4:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 1: Title Card")

def create_problem_scene():
    """Scene 2: The Challenge"""
    duration = 6
    output = OUTPUT_DIR / "02_problem.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='THE CHALLENGE':fontsize=72:fontcolor={YELLOW}:
    x=(w-text_w)/2:y=150[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='• 1 in 4 women develop diabetes during menopause':fontsize=36:fontcolor={WHITE}:
    x=200:y=300[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='• Early detection can reduce risk by 58%':fontsize=36:fontcolor={WHITE}:
    x=200:y=380[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='• Current tools ignore metabolic diversity':fontsize=36:fontcolor={WHITE}:
    x=200:y=460[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='• Women need personalized risk assessment':fontsize=36:fontcolor={WHITE}:
    x=200:y=540[txt4];
    [txt4]fade=t=out:st=5:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 2: The Challenge")

def create_closing_scene():
    """Scene 9: Closing"""
    duration = 8
    output = OUTPUT_DIR / "09_closing.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='DIANA V2':fontsize=96:fontcolor={BLUE}:
    x=(w-text_w)/2:y=200[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='Empowering women through AI-driven health insights':fontsize=40:fontcolor={WHITE}:
    x=(w-text_w)/2:y=350[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='Built with Go, React, and Python ML':fontsize=32:fontcolor={LIGHT_TEXT}:
    x=(w-text_w)/2:y=450[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='github.com/Skufu/dianav2':fontsize=28:fontcolor={GREEN}:
    x=(w-text_w)/2:y=550[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
    text='Questions?':fontsize=36:fontcolor={YELLOW}:
    x=(w-text_w)/2:y=700[txt4];
    [txt4]fade=t=out:st=7:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 9: Closing")

def create_app_demo_scenes():
    """Create placeholder scenes for app demonstrations"""
    scenes = [
        ("03_dashboard", "DASHBOARD OVERVIEW", "Real-time risk score and metabolic profile", 5),
        ("04_assessment", "SMART ASSESSMENT", "ML-powered health data entry", 5),
        ("05_prediction", "INSTANT PREDICTION", "XGBoost model with 89% accuracy", 5),
        ("06_trends", "HEALTH TRENDS", "Visualize progress over time", 5),
        ("07_report", "CLINICAL REPORTS", "PDF reports for healthcare providers", 5),
        ("08_tech", "TECHNICAL HIGHLIGHTS", "Go backend + React frontend + Python ML", 5),
    ]
    
    for filename, title, subtitle, duration in scenes:
        output = OUTPUT_DIR / f"{filename}.mp4"
        
        filter_complex = f"""
        color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
        [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
        text='{title}':fontsize=64:fontcolor={BLUE}:
        x=(w-text_w)/2:y=250[title];
        [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
        text='{subtitle}':fontsize=40:fontcolor={WHITE}:
        x=(w-text_w)/2:y=350[sub];
        [sub]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:
        text='[Live App Demo]':fontsize=32:fontcolor={GREEN}:
        x=(w-text_w)/2:y=450[demo];
        [demo]fade=t=out:st={duration-1}:d=1[out]
        """
        
        cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
        run_ffmpeg(cmd, f"Scene: {title}")

def stitch_video():
    """Stitch all scenes together"""
    print(f"\n{'='*60}")
    print("Stitching final video...")
    print(f"{'='*60}")
    
    # Create file list
    scenes = [
        "01_title.mp4",
        "02_problem.mp4", 
        "03_dashboard.mp4",
        "04_assessment.mp4",
        "05_prediction.mp4",
        "06_trends.mp4",
        "07_report.mp4",
        "08_tech.mp4",
        "09_closing.mp4"
    ]
    
    file_list = OUTPUT_DIR / "file_list.txt"
    with open(file_list, "w") as f:
        for scene in scenes:
            scene_path = OUTPUT_DIR / scene
            if scene_path.exists():
                f.write(f"file '{scene_path}'\n")
    
    # Concatenate
    cmd = f'ffmpeg -y -f concat -safe 0 -i "{file_list}" -c copy "{FINAL_OUTPUT}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✓ Final video created: {FINAL_OUTPUT}")
        # Get video info
        info_cmd = f'ffprobe -v error -show_entries format=duration,size -of csv=p=0 "{FINAL_OUTPUT}"'
        info = subprocess.run(info_cmd, shell=True, capture_output=True, text=True)
        print(f"  Duration: {info.stdout.strip()}")
        return True
    else:
        print(f"Error: {result.stderr}")
        return False

def main():
    """Main execution"""
    print("="*60)
    print("DIANA V2 Demo Video Generator")
    print("="*60)
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create scenes
    create_title_scene()
    create_problem_scene()
    create_app_demo_scenes()
    create_closing_scene()
    
    # Stitch final video
    stitch_video()
    
    print("\n" + "="*60)
    print("Video production complete!")
    print(f"Output: {FINAL_OUTPUT}")
    print("="*60)

if __name__ == "__main__":
    main()
