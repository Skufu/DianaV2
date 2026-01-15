
from PIL import Image
import sys

def remove_black_background(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if the pixel is black (or very close to black)
            # You might need to adjust the tolerance if the generation isn't perfectly #000000
            if item[0] < 10 and item[1] < 10 and item[2] < 10:
                newData.append((0, 0, 0, 0))  # Set to transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully saved transparent image to {output_path}")
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python remove_bg.py <input_path> <output_path>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    remove_black_background(input_file, output_file)
