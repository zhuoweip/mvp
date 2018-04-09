import 'react-dates/initialize';
import '../css/react_dates.css';
import { DateRangePicker } from 'react-dates';
import React, { Component } from 'react';
import houselistingService from '../services/houseinfolist-service';
import ppsService from '../services/pps-service';
import ipfsService from '../services/ipfs-service';
import Carousel from 'nuka-carousel';
import Overlay from './overlay';

const alertify = require('../../node_modules/alertify/src/alertify.js')

class ListingsDetail extends Component {

  constructor(props) {
    super(props)

    this.STEP = {
      VIEW: 1,
      METAMASK: 2,
      PROCESSING: 3,
      PURCHASED: 4,
    }

    this.state = {
      category: "Loading...",
      name: "Loading...",
      price: "Loading...",
      ipfsHash: null,
      lister: null,
      pictures: [],
      step: this.STEP.VIEW,
      totalPrice: 0,
      slides:[],
      currentActive:0
    }

    this.handleBooking = this.handleBooking.bind(this);
  }

  loadListing() {




    var ipfsHash = houselistingService.getIpfsHashFromBytes32(this.props.listingId);
    houselistingService.getHouseInfoDetail(this.props.listingId)
    .then((result) => {
        var roominfo = JSON.parse(result[4]);
        this.setState({price:result[0].toNumber()});
        this.setState({category:roominfo.category});
        this.setState({location:roominfo.location});
        this.setState({beds:roominfo.beds});
        this.setState({lister:result[2]});
        return ipfsService.getListing(ipfsHash)
    }).then((result)=>{
          var descriptioninfo = JSON.parse(result);
         this.setState({descriptioninfo:descriptioninfo});
         if(descriptioninfo.selectedPictures && descriptioninfo.selectedPictures.length>0 && descriptioninfo.selectedPictures[0].imagePreviewUrl)
         {
          this.setState({previewurl:descriptioninfo.selectedPictures[0].imagePreviewUrl});
          var slideArray = this.state.slides;

          for(var i =0;i < descriptioninfo.selectedPictures.length;i++)
          {
            var slide ={};
            slide.imgageUrl = descriptioninfo.selectedPictures[i].imagePreviewUrl;
            slideArray.push(slide);
          }

          this.setState({slides:slideArray});
         
         }

    }).catch((error) => {
      console.error(error);
    });
  }



  componentWillMount() {
    if (this.props.listingId) {
      // Load from IPFS
      this.loadListing();
    }
  
  }

  handleBooking() {
    let unitsToBuy = 0;

    if (this.state.checkInDate && this.state.checkOutDate) {
      unitsToBuy = this.state.checkOutDate.diff(this.state.checkInDate, 'days');
    }
    this.setState({step: this.STEP.METAMASK});
    // hostaddress, totalTokens, uuid, from, to, days
    ppsService.setPreOrder( this.state.lister,
                                     this.state.price * unitsToBuy,
                                     this.props.listingId, 
                                     this.state.checkInDate.toDate().getDate(), 
                                     this.state.checkOutDate.toDate().getDate(),
                                     unitsToBuy
                                   )
    .then((transactionReceipt) => {
      console.log("Purchase request sent.")
      this.setState({step: this.STEP.PROCESSING})
      return ppsService.waitTransactionFinished(transactionReceipt.tx)
    })
    .then((blockNumber) => {
      this.setState({step: this.STEP.PURCHASED})
    })
    .catch((error) => {
      console.log(error)
      alertify.log("There was a problem booking this listing.\nSee the console for more details.")
      this.setState({step: this.STEP.VIEW})
    })
  }

  calcTotalPrice() {
    if (this.state.checkInDate && this.state.checkOutDate) {
      let days = this.state.checkOutDate.diff(this.state.checkInDate, 'days');
      return this.state.price * days;
    }
    return 0
  }

  render() {
    const price = typeof this.state.price === 'string' ? 0 : this.state.price
    return (

<div>
       {this.state.step===this.STEP.METAMASK &&
          <Overlay imageUrl="/images/spinner-animation.svg">
            Confirm transaction<br />
            Press &ldquo;Submit&rdquo; in MetaMask window
          </Overlay>
        }


        {this.state.step===this.STEP.PROCESSING &&
          <Overlay imageUrl="/images/spinner-animation.svg">
            Processing your booking<br />
            Please stand by...
          </Overlay>
        }



        {this.state.step===this.STEP.PURCHASED &&
          <Overlay imageUrl="/images/circular-check-button.svg">
            Booking was successful.<br />
            <a href="#" onClick={()=>window.location.reload()}>
              Reload page
            </a>
          </Overlay>
        }


      <Carousel>
       {this.state.slides.map(slide => (
        <div className="carousel-inner item">
        <img src={slide.imgageUrl}  />
        </div>
         ))}
      </Carousel>

      <div className="detail-content container">
      <div className="row">
      <div className="col-md-7 col-lg-7 col-sm-7">
      <div className="detail-content__click-cover">

      </div>
      </div>


      <div className="col-md-5 col-lg-5 col-sm-5">
      <div className="detail-summary">
          
          <div className="detail-price-div">
              
              <span className = "detail-price">
                $ PPS: {Number(price).toLocaleString(undefined, {minimumFractionDigits: 3})} 
              </span>
              <span className = "detail-price-font">Daily Price</span>
              <hr className="details-price-hr"/>
              <div className="details-daterange-div">

              {
                  this.props.listingId &&
                  <DateRangePicker
                    startDate={this.state.checkInDate}
                    startDateId="start_date"
                    endDate={this.state.checkOutDate}
                    startDatePlaceholderText="Check In"
                    endDatePlaceholderText="Check Out"
                    endDateId="end_date"
                    onDatesChange={({ startDate, endDate }) => {this.setState({checkInDate: startDate, checkOutDate: endDate })}}
                    focusedInput={this.state.focusedInput}
                    onFocusChange={focusedInput => this.setState({ focusedInput })}
                  />
              }
              </div>

              <div className ="details-totalprice-div">
               <span className = "detail-totalprice-font">Total Price</span>
               <span className = "detail-totalprice">
                $ PPS: {Number(this.calcTotalPrice()).toLocaleString(undefined, {minimumFractionDigits: 3})}
              </span>
             </div>

             <div className="detail-summary__action">
                 {
                    this.props.listingId &&
                    <button
                      className="bg-pink color-blue btn-lg btn-block text-bold text-center"
                      onClick={this.handleBooking}
                      disabled={!this.props.listingId || !this.state.checkInDate || !this.state.checkOutDate}
                      onMouseDown={e => e.preventDefault()}
                      >
                        Book
                    </button>
                }    

            
             <h4 className="text-center">You won’t be changed yet</h4>
             </div>

        </div>
      


      </div>
      </div>
      </div>
      </div>



      <div className="listing-detail">
    

        <div className="container listing-container">
          <div className="row">
            <div className="col-12 col-md-8 detail-info-box">
              <div className="category">{this.state.category} ({this.state.beds} beds)</div>
              <div className="title">{this.state.location}</div>
              <div className="category">Creator</div>
              <div className="description">{this.state.lister}</div>
              <a href={ipfsService.gatewayUrlForHash(this.state.ipfsHash)} target="_blank">
                View on IPFS <big>&rsaquo;</big>
              </a>
              <div className="debug">
                <li>IPFS: {this.state.ipfsHash}</li>
                <li>Lister: {this.state.lister}</li>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="buy-box">
                <div>
                  <span>Daily Price</span>
                  <span className="price">
                    {Number(price).toLocaleString(undefined, {minimumFractionDigits: 3})} PPS
                  </span>
                </div>
                {this.props.listingId &&
                  <div>
                    <span>Total Price</span>
                    <span className="price">
                      {Number(this.calcTotalPrice()).toLocaleString(undefined, {minimumFractionDigits: 3})} PPS
                    </span>
                  </div>
                }
               

                <div>
                  
                  {
                    this.props.listingId &&
                    <button
                      className="button"
                      onClick={this.handleBooking}
                      disabled={!this.props.listingId || !this.state.checkInDate || !this.state.checkOutDate}
                      onMouseDown={e => e.preventDefault()}
                      >
                        Book
                    </button>
                  
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


 </div>     
    )
  }
}

export default ListingsDetail
