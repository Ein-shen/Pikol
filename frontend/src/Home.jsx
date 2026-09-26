
import pikolBg from './assets/pikol.jpg';
import { Link } from 'react-router-dom';


export const Home = () => {
  return (
    <div className='min-h-screen w-full bg-[#5A9F68]'>
      <div className='relative min-h-screen overflow-hidden flex flex-col'>

        {/* Blurred background image */}
        <div
          className='absolute inset-0 bg-cover bg-center bg-no-repeat blur-md scale-110'
          style={{ backgroundImage: `url(${pikolBg})` }}
        />

        {/* Dark tint */}
        <div className='absolute inset-0 bg-black/30' />

        {/* Header: logo + sign in */}
        <div className='relative z-10 flex flex-row items-center justify-between px-5 sm:px-8 md:px-12 lg:px-20 py-5 sm:py-8'>

          <h1 className='font-bold italic text-gray-300 text-base sm:text-lg md:text-xl'>
            Pikol League
          </h1>

          <Link 
          to="/login"
          className='px-4 sm:px-5 py-2 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/20 transition-colors'>
            Sign in
          </Link>

        </div>

            {/* Hero section */}
          <div className='flex flex-col md:flex-row px-5 py-5 ms:space-x-5 sm:flex-row  w-full justify-center   relative z-10 w-full  flex-1 flex-col justify-center px-5 sm:px-8 md:px-12 lg:px-20 xl:pl-20 py-16 sm:py-15'>
            <div className='w-full'>
                <h1 className='text-gray-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight pb-6'>
                  One platform that can manage{' '}
                  <span className='text-[#A8D38D]'>
                    your open play & tournaments
                  </span>{' '}
                  efficiently
                </h1>

                <p className='text-gray-300 text-base sm:text-lg md:text-xl pb-8 max-w-lg'>
                  Streamline scheduling, brackets, and player
                  management — all in one place.
                </p>


                <div className='space-x-5'>

                  <Link 
                    to="/signup"
                    className='w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors'>
                      Create Account
                    </Link>

                    <Link 
                    
                    className='w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors'>
                    Learn more
                    </Link>
                </div>
                
              </div>

            <div className='flex justify-rigth rounded-lg                         right-0 bg-white/20 h-100 w-2xl'> 

              <h1 className='font-bold text-2xl text-white'>hello this intended to add video abou tpickle here</h1>

              </div>

          

          


        </div>

        
      </div>
    </div>
  );
};