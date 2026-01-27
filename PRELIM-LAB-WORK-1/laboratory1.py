import time
import random
import os

def bubble_sort(arr):
    """
    Sorts an array using the bubble sort algorithm (ascending order).
    
    Args:
        arr: List of comparable elements to sort
        
    Returns:
        Tuple of (sorted list, time taken in seconds)
    """
    start_time = time.time()
    n = len(arr)
    
    # Traverse through all array elements
    for i in range(n):
        # Flag to optimize by detecting if array is already sorted
        swapped = False
        
        # Last i elements are already in place
        for j in range(0, n - i - 1):
            # Swap if the element found is greater than the next element
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        
        # If no swaps occurred, array is sorted
        if not swapped:
            break
    
    end_time = time.time()
    time_taken = end_time - start_time
    
    return arr, time_taken

def generate_random_dataset(size=10000, min_val=1, max_val=100000):
    """
    Generate a random dataset of integers.
    
    Args:
        size: Number of elements to generate (default: 10000)
        min_val: Minimum value for random integers
        max_val: Maximum value for random integers
        
    Returns:
        List of random integers
    """
    return [random.randint(min_val, max_val) for _ in range(size)]

def find_data_file():
    """Search for data.txt in common locations"""
    current_dir = os.getcwd()
    
    # Possible locations to search
    possible_paths = [
        'data.txt',  # Current directory
        os.path.join('PRELIM-LAB-WORK-1', 'data.txt'),
        os.path.join('PRELIM-LAB-WORK-2', 'data.txt'),
        os.path.join('..', 'PRELIM-LAB-WORK-1', 'data.txt'),
        os.path.join('..', 'PRELIM-LAB-WORK-2', 'data.txt'),
    ]
    
    print(f"\nCurrent directory: {current_dir}")
    print("Searching for data.txt...")
    
    # Try each possible path
    for path in possible_paths:
        full_path = os.path.abspath(path)
        if os.path.exists(full_path):
            print(f"✓ Found data.txt at: {full_path}")
            return full_path
    
    # If not found in common locations, search subdirectories
    print("\nSearching in subdirectories...")
    for root, dirs, files in os.walk(current_dir):
        if 'data.txt' in files:
            full_path = os.path.join(root, 'data.txt')
            print(f"✓ Found data.txt at: {full_path}")
            return full_path
    
    return None

def load_dataset_from_file(filename):
    """
    Load dataset from a text file (one number per line).
    
    Args:
        filename: Path to the data file
        
    Returns:
        List of integers or None if file not found
    """
    try:
        with open(filename, 'r') as file:
            data = []
            for line in file:
                line = line.strip()
                if line:
                    data.append(int(line))
        return data
    except FileNotFoundError:
        print(f"Error: {filename} not found!")
        return None
    except ValueError as e:
        print(f"Error: Invalid data in file - {e}")
        return None

def save_dataset_to_file(data, filename):
    """
    Save dataset to a text file (one number per line).
    
    Args:
        data: List of integers
        filename: Path to save the file
    """
    with open(filename, 'w') as file:
        for num in data:
            file.write(f"{num}\n")
    print(f"✓ Dataset saved to {filename}")

def verify_sorting(original, sorted_arr):
    """
    Verify that the array is correctly sorted.
    
    Args:
        original: Original array
        sorted_arr: Sorted array
        
    Returns:
        Boolean indicating if sorting is correct
    """
    # Check if all elements are present
    if sorted(original) != sorted_arr:
        return False
    
    # Check if array is in ascending order
    for i in range(len(sorted_arr) - 1):
        if sorted_arr[i] > sorted_arr[i + 1]:
            return False
    
    return True

def display_menu():
    """Display menu options"""
    print("\n" + "=" * 70)
    print("LABORATORY 1: BUBBLE SORT - 10,000 INTEGERS")
    print("=" * 70)
    print("1. Generate new random dataset (10,000 integers)")
    print("2. Auto-search and load data.txt")
    print("3. Load dataset from custom file path")
    print("4. Run Bubble Sort on current dataset")
    print("5. View dataset statistics")
    print("6. Save current dataset to file")
    print("7. Exit")
    print("=" * 70)

def display_statistics(data):
    """Display statistics about the dataset"""
    print("\n" + "=" * 70)
    print("DATASET STATISTICS")
    print("=" * 70)
    print(f"Size: {len(data)} elements")
    print(f"Minimum value: {min(data)}")
    print(f"Maximum value: {max(data)}")
    print(f"First 20 elements: {data[:20]}")
    print(f"Last 20 elements: {data[-20:]}")
    print("=" * 70)

def display_sorting_results(original, sorted_arr, time_taken):
    """Display the results of sorting"""
    print("\n" + "=" * 70)
    print("BUBBLE SORT RESULTS")
    print("=" * 70)
    
    # Verify correctness
    is_correct = verify_sorting(original, sorted_arr)
    
    print(f"\nArray size: {len(sorted_arr)} elements")
    print(f"\nExecution time: {time_taken:.6f} seconds")
    print(f"Execution time: {time_taken * 1000:.3f} milliseconds")
    
    print(f"\nSorting verification: {'✓ PASSED' if is_correct else '✗ FAILED'}")
    
    print(f"\nSorted array (first 50 elements):")
    print(sorted_arr[:50])
    
    print(f"\nSorted array (last 50 elements):")
    print(sorted_arr[-50:])
    
    print(f"\nMinimum value: {sorted_arr[0]}")
    print(f"Maximum value: {sorted_arr[-1]}")
    
    print("=" * 70)
    
    # Option to display full sorted array
    show_full = input("\nDisplay full sorted array? (y/n): ").strip().lower()
    if show_full == 'y':
        print("\n" + "=" * 70)
        print("COMPLETE SORTED ARRAY")
        print("=" * 70)
        print(sorted_arr)
        print("=" * 70)

def main():
    """Main program"""
    print("=" * 70)
    print("LABORATORY 1: BUBBLE SORT IMPLEMENTATION")
    print("Dataset Size: 10,000 Integers")
    print("=" * 70)
    print("\nEnvironment Information:")
    print(f"Python Version: {os.sys.version}")
    print(f"Current Directory: {os.getcwd()}")
    
    dataset = None
    
    while True:
        display_menu()
        
        if dataset:
            print(f"\nCurrent dataset: {len(dataset)} elements loaded")
        else:
            print("\nNo dataset loaded")
        
        choice = input("\nEnter your choice (1-7): ").strip()
        
        if choice == '1':
            # Generate random dataset
            print("\nGenerating random dataset...")
            size = input("Enter dataset size (default 10000): ").strip()
            size = int(size) if size else 10000
            
            min_val = input("Enter minimum value (default 1): ").strip()
            min_val = int(min_val) if min_val else 1
            
            max_val = input("Enter maximum value (default 100000): ").strip()
            max_val = int(max_val) if max_val else 100000
            
            dataset = generate_random_dataset(size, min_val, max_val)
            print(f"✓ Generated {len(dataset)} random integers")
            print(f"Range: {min_val} to {max_val}")
            
        elif choice == '2':
            # Auto-search for data.txt
            data_path = find_data_file()
            
            if data_path:
                loaded_data = load_dataset_from_file(data_path)
                if loaded_data:
                    dataset = loaded_data
                    print(f"✓ Loaded {len(dataset)} integers")
            else:
                print("\n❌ Could not find data.txt file!")
                print("\nAvailable files in current directory:")
                for item in os.listdir('.'):
                    print(f"  - {item}")
                
                retry = input("\nWould you like to enter the path manually? (y/n): ").strip().lower()
                if retry == 'y':
                    filename = input("Enter the full path to data.txt: ").strip()
                    loaded_data = load_dataset_from_file(filename)
                    if loaded_data:
                        dataset = loaded_data
                        print(f"✓ Loaded {len(dataset)} integers from {filename}")
            
        elif choice == '3':
            # Load dataset from custom file
            filename = input("\nEnter filename or path (e.g., PRELIM-LAB-WORK-1/data.txt): ").strip()
            loaded_data = load_dataset_from_file(filename)
            if loaded_data:
                dataset = loaded_data
                print(f"✓ Loaded {len(dataset)} integers from {filename}")
            
        elif choice == '4':
            # Run bubble sort
            if dataset is None:
                print("\n❌ No dataset loaded! Please generate or load a dataset first.")
            else:
                print(f"\nRunning Bubble Sort on {len(dataset)} elements...")
                print("Please wait, this may take a moment...")
                
                # Make a copy to preserve original
                original = dataset.copy()
                sorted_arr, time_taken = bubble_sort(dataset.copy())
                
                display_sorting_results(original, sorted_arr, time_taken)
                
                # Ask if user wants to save sorted result
                save_sorted = input("\nSave sorted array to file? (y/n): ").strip().lower()
                if save_sorted == 'y':
                    filename = input("Enter filename (e.g., sorted_output.txt): ").strip()
                    save_dataset_to_file(sorted_arr, filename)
        
        elif choice == '5':
            # View statistics
            if dataset is None:
                print("\n❌ No dataset loaded! Please generate or load a dataset first.")
            else:
                display_statistics(dataset)
        
        elif choice == '6':
            # Save dataset to file
            if dataset is None:
                print("\n❌ No dataset loaded! Please generate or load a dataset first.")
            else:
                filename = input("\nEnter filename to save (e.g., my_dataset.txt): ").strip()
                save_dataset_to_file(dataset, filename)
        
        elif choice == '7':
            # Exit
            print("\n" + "=" * 70)
            print("Thank you for using the Bubble Sort Program!")
            print("=" * 70)
            break
        
        else:
            print("\n❌ Invalid choice! Please enter a number between 1 and 7.")
        
        if choice in ['1', '2', '3', '4', '5', '6']:
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()